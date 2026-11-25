import 'server-only';
import { db } from './db';
import { getQuote } from './quotes';
import { QuoteError } from './quote-validation';
import { adminNotificationContent, bookingEmailContent, pricedQuoteEmailContent, quoteEmailContent } from './quote-email-template';
import { adminNotificationEmail, isSyntheticNotification } from './notification-settings';

export async function sendQuoteEmail(quoteId, recipientOverride = '', type = 'acknowledgement', offer = null) {
  if (!process.env.MAILTRAP_API_TOKEN || !process.env.MAILTRAP_FROM_EMAIL) throw new QuoteError('Mailtrap sender is not configured.', 503);
  const quote = await getQuote(quoteId);
  if (!quote) throw new QuoteError('Quote not found.', 404);
  if (!['acknowledgement', 'booking_update', 'priced_quote', 'admin_quote', 'admin_booking'].includes(type)) throw new QuoteError('Invalid email type.');
  const admin = type === 'admin_quote' || type === 'admin_booking';
  if (['booking_update', 'admin_booking'].includes(type) && !quote.booking) throw new QuoteError('This quote has no linked booking.', 409);
  if (type === 'priced_quote' && (!offer || offer.quote_id !== quoteId || quote.status !== 'quoted' || offer.amount !== quote.quoted_total)) throw new QuoteError('Prepare a current priced quote before sending.', 409);
  const emailType = type === 'admin_quote' ? 'admin_quote' : type === 'admin_booking' ? `admin_booking_${quote.booking.status}` : type === 'priced_quote' ? `offer_${offer.id}` : type === 'booking_update' ? `booking_${quote.booking.status}` : 'acknowledgement';
  const recipient = (admin ? adminNotificationEmail : recipientOverride || quote.customer_snapshot.email).trim().toLowerCase();
  if (recipient.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || /\.(invalid|test|example)$/i.test(recipient)) throw new QuoteError('Use a real customer email address.');
  const sender = process.env.MAILTRAP_FROM_EMAIL;
  const c = await db.getConnection(); let emailId;
  try {
    await c.beginTransaction();
    await c.execute("INSERT INTO quote_emails (quote_id, email_type, recipient, sender, created_at, updated_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)", [quoteId, emailType, recipient, sender]);
    const [rows] = await c.execute("SELECT * FROM quote_emails WHERE quote_id = ? AND email_type = ? AND recipient = ? FOR UPDATE", [quoteId, emailType, recipient]);
    const row = rows[0]; emailId = row.id;
    if (row.status === 'accepted') { await c.commit(); return { status: 'accepted', recipient, messageId: row.provider_message_id, repeated: true }; }
    if (['sending', 'unknown'].includes(row.status)) throw new QuoteError('This email may already be sending. Check Mailtrap before retrying.', 409);
    await c.execute("UPDATE quote_emails SET status = 'sending', sender = ?, attempts = attempts + 1, last_error = NULL, updated_at = UTC_TIMESTAMP() WHERE id = ?", [sender, emailId]);
    await c.commit();
  } catch (error) { await c.rollback(); throw error; } finally { c.release(); }
  const content = admin ? adminNotificationContent(quote, type === 'admin_booking') : type === 'priced_quote' ? pricedQuoteEmailContent(quote, offer) : type === 'booking_update' ? bookingEmailContent(quote) : quoteEmailContent(quote);
  try {
    const response = await fetch('https://send.api.mailtrap.io/api/send', { method: 'POST', headers: { Authorization: `Bearer ${process.env.MAILTRAP_API_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: { email: sender, name: process.env.MAILTRAP_FROM_NAME || 'Limo804' }, to: [{ email: recipient }], ...content, category: admin ? 'Admin notification' : type === 'priced_quote' ? 'Priced quote' : type === 'booking_update' ? 'Booking update' : 'Quote acknowledgement' }), signal: AbortSignal.timeout(20000) });
    const result = await response.json();
    if (!response.ok || result.success !== true) {
      const message = String(result.message || result.errors?.join?.('; ') || 'Mailtrap rejected the email.').slice(0, 1000);
      const status = response.status >= 500 ? 'unknown' : 'failed';
      await db.execute('UPDATE quote_emails SET status = ?, last_error = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', [status, message, emailId]);
      throw new QuoteError(message, 502);
    }
    const messageId = result.message_ids?.[0] || null;
    await db.execute("UPDATE quote_emails SET status = 'accepted', provider_message_id = ?, accepted_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = ?", [messageId, emailId]);
    return { status: 'accepted', recipient, messageId, repeated: false };
  } catch (error) {
    if (!(error instanceof QuoteError)) await db.execute("UPDATE quote_emails SET status = 'unknown', last_error = 'Network or response error; check Mailtrap before retrying.', updated_at = UTC_TIMESTAMP() WHERE id = ?", [emailId]);
    throw error;
  }
}

export async function sendNewQuoteEmail(reference) {
  if (process.env.MAILTRAP_AUTO_SEND !== 'true') return;
  const [rows] = await db.execute('SELECT id, customer_snapshot FROM quotes WHERE reference = ?', [reference]);
  if (!rows[0]) return;
  const contact = typeof rows[0].customer_snapshot === 'string' ? JSON.parse(rows[0].customer_snapshot) : rows[0].customer_snapshot;
  // Synthetic fixtures must never generate real email during tests.
  if (/\.(invalid|test|example)$/i.test(contact.email || '')) return;
  return sendQuoteEmail(rows[0].id);
}

export async function sendAdminNotification(quoteId, type) {
  if (!['admin_quote', 'admin_booking'].includes(type)) throw new QuoteError('Invalid admin notification.');
  if (process.env.MAILTRAP_AUTO_SEND !== 'true') return;
  const quote = await getQuote(quoteId);
  if (!quote || isSyntheticNotification(quote)) return;
  return sendQuoteEmail(quoteId, '', type);
}

export async function sendAdminNewQuoteEmail(reference) {
  if (process.env.MAILTRAP_AUTO_SEND !== 'true') return;
  const [rows] = await db.execute('SELECT id FROM quotes WHERE reference = ?', [reference]);
  if (rows[0]) return sendAdminNotification(rows[0].id, 'admin_quote');
}
