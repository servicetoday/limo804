import 'server-only';
import { randomBytes } from 'node:crypto';
import { db } from './db';
import { getQuote } from './quotes';
import { QuoteError, validateQuoteUpdate } from './quote-validation';
import { offerToken, publicAppUrl, verifyOfferToken } from './quote-offer-token';
import { insertWithBookingReference } from './booking-reference';

const secret = () => process.env.CUSTOMER_QUOTE_SECRET || process.env.ADMIN_SESSION_SECRET;
const expired = offer => new Date(`${offer.expires_at.replace(' ', 'T')}Z`) <= new Date();
export function customerOfferUrl(offer) {
  return `${publicAppUrl(process.env.PUBLIC_APP_URL)}/quote/view/${offerToken(offer, secret())}`;
}
export async function preparePricedOffer(id, input) {
  let origin;
  try { origin = publicAppUrl(process.env.PUBLIC_APP_URL); } catch (error) { throw new QuoteError(error.message, 503); }
  const c = await db.getConnection();
  try {
    await c.beginTransaction();
    const [quotes] = await c.execute('SELECT * FROM quotes WHERE id = ? FOR UPDATE', [id]);
    const quote = quotes[0]; if (!quote) throw new QuoteError('Quote not found.', 404);
    if (!['submitted', 'quoted'].includes(quote.status)) throw new QuoteError('Only a submitted or quoted enquiry can be sent to the customer for confirmation.', 409);
    const change = validateQuoteUpdate({ status: 'quoted', quotedTotal: input.amount }, quote);
    const contact = typeof quote.customer_snapshot === 'string' ? JSON.parse(quote.customer_snapshot) : quote.customer_snapshot;
    const recipient = (input.recipient === undefined ? contact.email : input.recipient);
    if (typeof recipient !== 'string' || recipient.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim())) throw new QuoteError('Enter a valid recipient email address.');
    const email = recipient.trim().toLowerCase();
    const [current] = await c.execute("SELECT * FROM quote_offers WHERE quote_id = ? AND status = 'active' ORDER BY id DESC FOR UPDATE", [id]);
    const reusable = current.find(offer => offer.recipient === email && offer.amount === change.amount && !expired(offer) && quote.status === 'quoted' && quote.quoted_total === change.amount);
    let offer = reusable;
    if (!offer) {
      await c.execute("UPDATE quote_offers SET status = 'superseded' WHERE quote_id = ? AND status = 'active'", [id]);
      const nonce = randomBytes(32).toString('hex');
      const [result] = await c.execute("INSERT INTO quote_offers (quote_id, recipient, amount, currency, nonce, expires_at, created_at) VALUES (?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 DAY), UTC_TIMESTAMP())", [id, email, change.amount, quote.currency, nonce]);
      const [rows] = await c.execute('SELECT * FROM quote_offers WHERE id = ?', [result.insertId]); offer = rows[0];
      await c.execute("UPDATE quotes SET status = 'quoted', quoted_total = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?", [change.amount, id]);
      await c.execute("INSERT INTO quote_status_history (quote_id, from_status, to_status, actor, note, created_at) VALUES (?, ?, 'quoted', ?, ?, UTC_TIMESTAMP())", [id, quote.status, process.env.ADMIN_USERNAME || 'admin', `Customer price offer prepared: ${quote.currency} ${change.amount}, valid for seven days.`]);
    }
    await c.commit();
    return { ...offer, url: `${origin}/quote/view/${offerToken(offer, secret())}` };
  } catch (error) { await c.rollback(); throw error; } finally { c.release(); }
}
async function findOffer(token) {
  if (typeof token !== 'string' || !/^\d{1,10}\.[a-f0-9]{64}$/.test(token)) throw new QuoteError('Quote link not found.', 404);
  const [rows] = await db.execute('SELECT * FROM quote_offers WHERE id = ?', [token.split('.')[0]]);
  if (!verifyOfferToken(token, rows[0], secret())) throw new QuoteError('Quote link not found.', 404);
  return rows[0];
}
export async function customerOffer(token) {
  const offer = await findOffer(token);
  const quote = await getQuote(offer.quote_id);
  let state = 'active';
  if (expired(offer)) state = 'expired';
  else if (offer.status === 'accepted' && quote.booking) state = 'confirmed';
  else if (offer.status !== 'active' || quote.status !== 'quoted' || quote.quoted_total !== offer.amount) state = 'superseded';
  return {
    state, reference: quote.reference, amount: offer.amount, currency: offer.currency, expiresAt: offer.expires_at,
    passengerName: quote.passenger_snapshot.displayName, durationHours: quote.duration_hours,
    vehicleName: quote.vehicle_name_snapshot || (quote.preferred_category === 'sedan' ? 'Sedan' : quote.preferred_category === 'suv' ? 'Luxury SUV' : 'To be arranged'),
    isTest: /^DUMMY/i.test(quote.customer_reference || ''),
    journeys: quote.journeys.map(journey => ({ sequence: journey.sequence_number, pickup: journey.pickup_location, dropoff: journey.dropoff_location, date: journey.pickup_local_date, time: journey.pickup_local_time?.slice(0, 5), timezone: journey.timezone, passengers: journey.passengers, flight: journey.arriving_flight, flightBased: journey.timing_source === 'flight', stops: journey.stops.map(stop => stop.location) })),
    booking: state === 'confirmed' ? { reference: quote.booking.reference, status: quote.booking.status } : null,
  };
}
export async function acceptCustomerOffer(token) {
  const initial = await findOffer(token); const c = await db.getConnection();
  try {
    await c.beginTransaction();
    const [quotes] = await c.execute('SELECT * FROM quotes WHERE id = ? FOR UPDATE', [initial.quote_id]);
    const quote = quotes[0];
    const [offers] = await c.execute('SELECT * FROM quote_offers WHERE id = ? FOR UPDATE', [initial.id]);
    const offer = offers[0];
    if (!verifyOfferToken(token, offer, secret())) throw new QuoteError('Quote link not found.', 404);
    if (expired(offer)) throw new QuoteError('This quote link has expired. Please request an updated quote.', 410);
    if (offer.status === 'accepted') {
      const [bookings] = await c.execute('SELECT reference, status FROM bookings WHERE id = ?', [offer.booking_id]);
      if (!bookings[0]) throw new QuoteError('Contact our team about this booking.', 409);
      await c.commit(); return { booking: bookings[0], quoteId: quote.id, recipient: offer.recipient, repeated: true };
    }
    if (offer.status !== 'active' || quote.status !== 'quoted' || quote.quoted_total !== offer.amount) throw new QuoteError('This quote has changed. Please use the latest email or request a new quote.', 409);
    const [past] = await c.execute('SELECT COUNT(*) AS count FROM quote_journeys WHERE quote_id = ? AND pickup_at_utc IS NOT NULL AND pickup_at_utc <= UTC_TIMESTAMP()', [quote.id]);
    if (past[0].count > 0) throw new QuoteError('The pick-up time has passed. Please request an updated quote.', 410);
    const { id: bookingId, reference: ref } = await insertWithBookingReference(async ref => {
      const [booking] = await c.execute("INSERT INTO bookings (reference, quote_id, status, total_amount, currency, assigned_fleet_id, created_at, confirmed_at) VALUES (?, ?, 'confirmed', ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())", [ref, quote.id, offer.amount, offer.currency, quote.preferred_fleet_id]);
      return booking.insertId;
    });
    await c.execute("UPDATE quote_offers SET status = 'accepted', accepted_at = UTC_TIMESTAMP(), booking_id = ? WHERE id = ?", [bookingId, offer.id]);
    await c.execute("UPDATE quote_offers SET status = 'superseded' WHERE quote_id = ? AND status = 'active'", [quote.id]);
    await c.execute("UPDATE quotes SET status = 'converted', updated_at = UTC_TIMESTAMP() WHERE id = ?", [quote.id]);
    await c.execute("INSERT INTO quote_status_history (quote_id, from_status, to_status, actor, note, created_at) VALUES (?, 'quoted', 'accepted', 'customer', ?, UTC_TIMESTAMP()), (?, 'accepted', 'converted', 'customer', ?, UTC_TIMESTAMP())", [quote.id, `Customer accepted offer ${offer.id} at ${offer.currency} ${offer.amount} using the private quote link.`, quote.id, `Customer confirmed booking ${ref}. Vehicle assignment is separate.`]);
    await c.commit();
    return { booking: { reference: ref, status: 'confirmed' }, quoteId: quote.id, recipient: offer.recipient, repeated: false };
  } catch (error) { await c.rollback(); throw error; } finally { c.release(); }
}
