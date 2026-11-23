import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { db } from './db';
import { QuoteError, validateQuote, validateQuoteUpdate } from './quote-validation';
import { insertWithQuoteReference } from './quote-reference';

const utcNow = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const hash = value => createHash('sha256').update(value).digest('hex');
const reference = prefix => `${prefix}-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(8).toString('hex').toUpperCase()}`;
const parseJson = value => typeof value === 'string' ? JSON.parse(value) : value;
async function insert(c, table, record) {
  const keys = Object.keys(record);
  const [result] = await c.execute(`INSERT INTO ${table} (${keys.map(key => `\`${key}\``).join(',')}) VALUES (${keys.map(() => '?').join(',')})`, Object.values(record));
  return result.insertId;
}
async function saveCustomer(c, contact) {
  const key = hash(JSON.stringify([contact.displayName.toLowerCase(), contact.email, contact.countryCode, contact.mobile?.replace(/\D/g, '') || null]));
  const [result] = await c.execute('INSERT INTO customers (contact_key, first_name, last_name, display_name, email, country_code, mobile, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)', [key, contact.firstName, contact.lastName, contact.displayName, contact.email, contact.countryCode, contact.mobile]);
  return result.insertId;
}
export async function prepareQuoteFile(file) {
  if (!file) return null;
  if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024) throw new QuoteError('Choose an itinerary file under 10 MB.');
  const buffer = Buffer.from(await file.arrayBuffer());
  let extension; let mime;
  if (buffer.toString('ascii', 0, 5) === '%PDF-') { extension = 'pdf'; mime = 'application/pdf'; }
  else if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) { extension = 'jpg'; mime = 'image/jpeg'; }
  else if (buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) { extension = 'png'; mime = 'image/png'; }
  else if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') { extension = 'webp'; mime = 'image/webp'; }
  else if (buffer.toString('ascii', 4, 8) === 'ftyp' && /heic|heix|hevc|hevx|mif1/.test(buffer.toString('ascii', 8, 32))) { extension = 'heic'; mime = 'image/heic'; }
  if (!extension) throw new QuoteError('Attach a PDF, JPG, PNG, WebP or HEIC itinerary file.');
  return { buffer, extension, mime, originalName: file.name.replace(/[\x00-\x1f\x7f\\/]/g, '_').slice(0, 255) || `itinerary.${extension}`, sha256: hash(buffer) };
}
function receipt(row) { return { reference: row.reference, status: row.status }; }
export async function submitQuote(raw, file) {
  // Validate structure first so an identical retry still works after its pick-up time.
  const data = validateQuote(raw, new Date(0));
  const requestHash = hash(JSON.stringify(data) + (file?.sha256 || ''));
  const [existing] = await db.execute('SELECT reference, status, request_hash FROM quotes WHERE submission_key = ?', [data.submissionKey]);
  if (existing.length) {
    if (existing[0].request_hash !== requestHash) throw new QuoteError('This submission was already used for a different quote. Please start a new request.', 409);
    return { ...receipt(existing[0]), repeated: true };
  }
  validateQuote(raw);
  const c = await db.getConnection(); let storedFile = '';
  try {
    await c.beginTransaction();
    let vehicle = null;
    if (data.fleetId) {
      const [rows] = await c.execute('SELECT id, name, category, passengers FROM fleet WHERE id = ? AND is_active = TRUE AND deleted_at IS NULL', [data.fleetId]);
      if (!rows[0]) throw new QuoteError('This vehicle is no longer available. Please choose another vehicle.');
      vehicle = rows[0];
      if (data.legs.some(leg => leg.passengers > vehicle.passengers)) throw new QuoteError('Your passenger count exceeds this vehicle’s capacity. Please choose another vehicle.');
    }
    const passengerId = await saveCustomer(c, data.customer.passenger);
    const customerId = data.customer.someoneElse ? await saveCustomer(c, data.customer.booker) : passengerId;
    const now = utcNow();
    const { id: quoteId, reference: ref } = await insertWithQuoteReference(ref => insert(c, 'quotes', { reference: ref, submission_key: data.submissionKey, request_hash: requestHash, customer_id: customerId, passenger_id: passengerId, customer_snapshot: JSON.stringify(data.customer.booker), passenger_snapshot: JSON.stringify(data.customer.passenger), booking_for_someone_else: data.customer.someoneElse, status: 'submitted', service_type: data.service, journey_type: data.journey, preferred_category: vehicle?.category || data.category, preferred_fleet_id: vehicle?.id || null, vehicle_name_snapshot: vehicle?.name || null, duration_hours: data.hours, pickup_sign_name: data.customer.signName, chauffeur_note: data.customer.chauffeurNote, customer_reference: data.customer.reference, voucher_code: data.customer.voucher, flight_itinerary: data.flightText, created_at: now, updated_at: now }));
    for (const [index, leg] of data.legs.entries()) {
      const journeyId = await insert(c, 'quote_journeys', { quote_id: quoteId, sequence_number: index + 1, leg_type: leg.legType, pickup_location: leg.pickup, dropoff_location: leg.dropoff, pickup_local_date: leg.date, pickup_local_time: leg.time, pickup_at_utc: leg.utc, timezone: 'Australia/Sydney', passengers: leg.passengers, timing_source: leg.flightScheduled ? 'flight' : 'manual', arriving_flight: leg.flightNumber, flight_unknown: leg.flightUnknown });
      for (const [stopIndex, location] of leg.stops.entries()) await insert(c, 'quote_stops', { journey_id: journeyId, sequence_number: stopIndex + 1, location });
    }
    if (file) {
      storedFile = `${randomBytes(16).toString('hex')}.${file.extension}`;
      const dir = path.join(process.cwd(), 'storage', 'quotes'); await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, storedFile), file.buffer, { flag: 'wx' });
      await insert(c, 'quote_attachments', { quote_id: quoteId, original_name: file.originalName, storage_name: storedFile, mime_type: file.mime, size_bytes: file.buffer.length, sha256: file.sha256, created_at: now });
    }
    await insert(c, 'quote_status_history', { quote_id: quoteId, from_status: null, to_status: 'submitted', actor: 'customer', note: 'Quote request submitted.', created_at: now });
    await c.commit();
    return { reference: ref, status: 'submitted', repeated: false };
  } catch (error) {
    await c.rollback();
    if (storedFile) await unlink(path.join(process.cwd(), 'storage', 'quotes', storedFile)).catch(() => {});
    if (error.code === 'ER_DUP_ENTRY') {
      const [rows] = await c.execute('SELECT reference, status, request_hash FROM quotes WHERE submission_key = ?', [data.submissionKey]);
      if (rows[0]?.request_hash === requestHash) return { ...receipt(rows[0]), repeated: true };
    }
    throw error;
  } finally { c.release(); }
}

export async function listQuotes() {
  const [rows] = await db.execute('SELECT q.id, q.reference, q.status, q.service_type, q.journey_type, q.currency, q.quoted_total, q.created_at, p.display_name AS passenger_name, c.display_name AS customer_name FROM quotes q JOIN customers p ON p.id = q.passenger_id JOIN customers c ON c.id = q.customer_id ORDER BY q.id DESC LIMIT 200');
  return rows;
}
export async function getQuote(id) {
  const [quotes] = await db.execute('SELECT * FROM quotes WHERE id = ?', [id]);
  if (!quotes[0]) return null;
  const quote = { ...quotes[0], customer_snapshot: parseJson(quotes[0].customer_snapshot), passenger_snapshot: parseJson(quotes[0].passenger_snapshot) };
  delete quote.submission_key; delete quote.request_hash;
  const [journeys] = await db.execute('SELECT * FROM quote_journeys WHERE quote_id = ? ORDER BY sequence_number', [id]);
  const [stops] = await db.execute('SELECT s.* FROM quote_stops s JOIN quote_journeys j ON j.id = s.journey_id WHERE j.quote_id = ? ORDER BY s.sequence_number', [id]);
  const [attachments] = await db.execute('SELECT id, original_name, mime_type, size_bytes, created_at FROM quote_attachments WHERE quote_id = ?', [id]);
  const [history] = await db.execute('SELECT * FROM quote_status_history WHERE quote_id = ? ORDER BY id', [id]);
  const [bookings] = await db.execute('SELECT * FROM bookings WHERE quote_id = ?', [id]);
  const [emails] = await db.execute('SELECT id, email_type, recipient, sender, status, provider_message_id, attempts, last_error, created_at, accepted_at FROM quote_emails WHERE quote_id = ? ORDER BY id DESC', [id]);
  return { ...quote, journeys: journeys.map(journey => ({ ...journey, stops: stops.filter(stop => stop.journey_id === journey.id) })), attachments, history, emails, booking: bookings[0] || null };
}
export async function updateQuote(id, raw) {
  const c = await db.getConnection();
  try {
    await c.beginTransaction();
    const [rows] = await c.execute('SELECT * FROM quotes WHERE id = ? FOR UPDATE', [id]);
    if (!rows[0]) throw new QuoteError('Quote not found.', 404);
    const change = validateQuoteUpdate(raw, rows[0]);
    const old = rows[0];
    if (change.status !== old.status || change.amount !== old.quoted_total) await c.execute("UPDATE quote_offers SET status = 'superseded' WHERE quote_id = ? AND status = 'active'", [id]);
    await c.execute('UPDATE quotes SET status = ?, quoted_total = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', [change.status, change.amount, id]);
    await insert(c, 'quote_status_history', { quote_id: id, from_status: old.status, to_status: change.status, actor: process.env.ADMIN_USERNAME || 'admin', note: `${change.note}${change.note ? '\n' : ''}Quote total: ${change.amount === null ? 'not set' : `AUD ${change.amount}`}.`, created_at: utcNow() });
    await c.commit(); return getQuote(id);
  } catch (error) { await c.rollback(); throw error; } finally { c.release(); }
}
export async function convertQuote(id) {
  const c = await db.getConnection();
  try {
    await c.beginTransaction();
    const [quotes] = await c.execute('SELECT * FROM quotes WHERE id = ? FOR UPDATE', [id]);
    if (!quotes[0]) throw new QuoteError('Quote not found.', 404);
    const [existing] = await c.execute('SELECT id, reference, status FROM bookings WHERE quote_id = ?', [id]);
    if (existing[0]) { await c.commit(); return existing[0]; }
    const quote = quotes[0];
    if (quote.status !== 'accepted' || quote.quoted_total === null) throw new QuoteError('Only an accepted quote with a price can become a booking.', 409);
    const ref = reference('B');
    const bookingId = await insert(c, 'bookings', { reference: ref, quote_id: id, status: 'pending', total_amount: quote.quoted_total, currency: quote.currency, created_at: utcNow() });
    await c.execute("UPDATE quotes SET status = 'converted', updated_at = UTC_TIMESTAMP() WHERE id = ?", [id]);
    await insert(c, 'quote_status_history', { quote_id: id, from_status: 'accepted', to_status: 'converted', actor: process.env.ADMIN_USERNAME || 'admin', note: `Created pending booking ${ref}. Vehicle assignment and confirmation are still required.`, created_at: utcNow() });
    await c.commit(); return { id: bookingId, reference: ref, status: 'pending' };
  } catch (error) { await c.rollback(); throw error; } finally { c.release(); }
}
