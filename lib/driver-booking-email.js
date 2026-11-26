import 'server-only';
import { db } from './db';
import { getQuote } from './quotes';
import { QuoteError } from './quote-validation';
import { driverEmailRecipient, driverEmailType } from './driver-validation';
import { driverBookingEmailContent, driverUnassignedEmailContent } from './driver-booking-email-template';
import { driverBookingUrl } from './driver-booking-token';

export async function sendDriverBookingEmail(id, { resend = false, assignmentVersion } = {}) {
  if (!process.env.MAILTRAP_API_TOKEN || !process.env.MAILTRAP_FROM_EMAIL) throw new QuoteError('Mailtrap sender is not configured.', 503);
  const c = await db.getConnection();
  let emailId, content, notificationType, recipient;
  const sender = process.env.MAILTRAP_FROM_EMAIL;
  try {
    await c.beginTransaction();
    const [rows] = await c.execute('SELECT * FROM bookings WHERE id = ? FOR UPDATE', [id]);
    const booking = rows[0];
    if (!booking) throw new QuoteError('Booking not found.', 404);
    if (assignmentVersion !== undefined && booking.driver_assignment_version !== assignmentVersion) throw new QuoteError('The booking assignment changed. Refresh the booking before sending.', 409);
    if (['cancelled', 'completed'].includes(booking.status)) throw new QuoteError('This booking can no longer be sent to a driver.', 409);
    const quote = await getQuote(booking.quote_id);
    if (!quote) throw new QuoteError('Quote not found.', 404);
    if (!booking.assigned_driver_id && booking.unassigned_driver_name) {
      recipient = driverEmailRecipient(booking.unassigned_driver_email);
      notificationType = 'unassigned';
      content = driverUnassignedEmailContent(booking, booking.unassigned_driver_name, quote);
    } else {
      if (!booking.assigned_driver_id) throw new QuoteError('Assign a driver before sending.');
      const [drivers] = await c.execute('SELECT * FROM drivers WHERE id = ? FOR UPDATE', [booking.assigned_driver_id]);
      if (!drivers[0]) throw new QuoteError('The assigned driver is unavailable.', 409);
      recipient = driverEmailRecipient(drivers[0].email);
      let vehicle = null;
      if (booking.assigned_fleet_id !== null) {
        const [vehicles] = await c.execute('SELECT * FROM fleet WHERE id = ? AND is_active = TRUE AND deleted_at IS NULL FOR UPDATE', [booking.assigned_fleet_id]);
        vehicle = vehicles[0];
        if (!vehicle) throw new QuoteError('The assigned vehicle is unavailable.', 409);
        if (quote.journeys.some(journey => journey.passengers > vehicle.passengers)) throw new QuoteError('The assigned vehicle has insufficient passenger capacity.', 409);
      }
      notificationType = 'assigned';
      let bookingUrl;
      try { bookingUrl = driverBookingUrl(booking); }
      catch { throw new QuoteError('Driver booking link is not configured. Check DRIVER_BOOKING_LINK_SECRET or ADMIN_SESSION_SECRET.', 503); }
      content = driverBookingEmailContent(booking, drivers[0], vehicle, quote, bookingUrl);
    }
    const type = driverEmailType(booking);
    await c.execute('INSERT INTO quote_emails (quote_id, email_type, recipient, sender, created_at, updated_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)', [booking.quote_id, type, recipient, sender]);
    const [emails] = await c.execute('SELECT * FROM quote_emails WHERE quote_id = ? AND email_type = ? AND recipient = ? FOR UPDATE', [booking.quote_id, type, recipient]);
    const email = emails[0]; emailId = email.id;
    if (email.status === 'accepted' && !resend) { await c.commit(); return { status: 'accepted', recipient, notificationType, repeated: true }; }
    if (email.status === 'sending' || (email.status === 'unknown' && !resend)) throw new QuoteError('This email may already be sending. Check Mailtrap before retrying.', 409);
    await c.execute("UPDATE quote_emails SET status = 'sending', attempts = attempts + 1, last_error = NULL, provider_message_id = NULL, accepted_at = NULL, updated_at = UTC_TIMESTAMP() WHERE id = ?", [emailId]);
    await c.commit();
  } catch (error) { await c.rollback(); throw error; } finally { c.release(); }

  try {
    const response = await fetch('https://send.api.mailtrap.io/api/send', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.MAILTRAP_API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: { email: sender, name: process.env.MAILTRAP_FROM_NAME || 'Limo804' }, to: [{ email: recipient }], ...content, category: notificationType === 'unassigned' ? 'Driver booking unassignment' : 'Driver booking assignment' }), signal: AbortSignal.timeout(20000),
    });
    const result = await response.json();
    if (!response.ok || result.success !== true) {
      const message = String(result.message || result.errors?.join?.('; ') || 'Mailtrap rejected the email.').slice(0, 1000);
      await db.execute('UPDATE quote_emails SET status = ?, last_error = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', [response.status >= 500 ? 'unknown' : 'failed', message, emailId]);
      throw new QuoteError(message, 502);
    }
    const messageId = result.message_ids?.[0] || null;
    await db.execute("UPDATE quote_emails SET status = 'accepted', provider_message_id = ?, accepted_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = ?", [messageId, emailId]);
    return { status: 'accepted', recipient, messageId, notificationType, repeated: false };
  } catch (error) {
    if (!(error instanceof QuoteError)) await db.execute("UPDATE quote_emails SET status = 'unknown', last_error = 'Network or response error; check Mailtrap before retrying.', updated_at = UTC_TIMESTAMP() WHERE id = ?", [emailId]);
    throw error;
  }
}
