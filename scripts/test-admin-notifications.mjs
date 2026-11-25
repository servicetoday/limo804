// Run: node --conditions=react-server scripts/test-admin-notifications.mjs
// Mailtrap is mocked; no real email is transmitted.
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { randomUUID, randomBytes } from 'node:crypto';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && /^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return nextResolve(specifier + '.js', context);
    throw error;
  }
} });
const { db } = await import('../lib/db.js');
const { sendQuoteEmail, sendAdminNotification, sendAdminNewQuoteEmail } = await import('../lib/quote-email.js');
const suffix = randomUUID().slice(0, 8);
let customerId, quoteId, bookingId;
const sent = [];
globalThis.fetch = async (url, options) => {
  assert.equal(url, 'https://send.api.mailtrap.io/api/send');
  sent.push(JSON.parse(options.body));
  return Response.json({ success: true, message_ids: [`mock-${sent.length}`] });
};
process.env.MAILTRAP_API_TOKEN = 'mock';
process.env.MAILTRAP_FROM_EMAIL = 'sender@example.com';
process.env.MAILTRAP_AUTO_SEND = 'true';
try {
  const [customer] = await db.execute("INSERT INTO customers (contact_key, first_name, last_name, display_name, email, created_at) VALUES (?, 'TEST', 'NOTIFICATIONS', 'TEST NOTIFICATIONS', 'customer@example.com', UTC_TIMESTAMP())", [randomBytes(32).toString('hex')]);
  customerId = customer.insertId;
  const snapshot = JSON.stringify({ displayName: 'TEST NOTIFICATIONS', email: 'customer@example.com' });
  const reference = `Q-AN-${suffix}`;
  const [quote] = await db.execute("INSERT INTO quotes (reference, submission_key, request_hash, customer_id, passenger_id, customer_snapshot, passenger_snapshot, status, service_type, journey_type, chauffeur_note, flight_itinerary, customer_reference, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'converted', 'transfer', 'one-way', 'TEST ONLY', '', 'DUMMY-ADMIN-NOTIFICATION', UTC_TIMESTAMP(), UTC_TIMESTAMP())", [reference, randomUUID(), randomBytes(32).toString('hex'), customerId, customerId, snapshot, snapshot]);
  quoteId = quote.insertId;
  await db.execute("INSERT INTO quote_journeys (quote_id, sequence_number, leg_type, pickup_location, dropoff_location, pickup_local_date, pickup_local_time, timezone, passengers, timing_source) VALUES (?, 1, 'outbound', 'TEST origin', 'TEST destination', '2099-01-02', '10:00', 'Australia/Sydney', 2, 'manual')", [quoteId]);
  const [booking] = await db.execute("INSERT INTO bookings (reference, quote_id, status, total_amount, created_at) VALUES (?, ?, 'confirmed', 150, UTC_TIMESTAMP())", [`B-AN-${suffix}`, quoteId]);
  bookingId = booking.insertId;
  assert.equal(await sendAdminNotification(quoteId, 'admin_quote'), undefined);
  assert.equal(sent.length, 0);
  await db.execute("UPDATE quotes SET customer_reference = 'MOCK-ADMIN-NOTIFICATION' WHERE id = ?", [quoteId]);
  await sendAdminNewQuoteEmail(reference);
  await sendAdminNotification(quoteId, 'admin_booking');
  assert.equal(sent.length, 2);
  for (const email of sent) assert.deepEqual(email.to, [{ email: 'admin@limo804.com.au' }]);
  assert.match(sent[0].subject, /New quote request/);
  assert.match(sent[1].subject, /New confirmed booking/);
  assert.equal((await sendAdminNotification(quoteId, 'admin_booking')).repeated, true);
  assert.equal(sent.length, 2);
  await sendQuoteEmail(quoteId);
  assert.deepEqual(sent[2].to, [{ email: 'customer@example.com' }]);
  const [logs] = await db.execute('SELECT recipient, status FROM quote_emails WHERE quote_id = ?', [quoteId]);
  assert.equal(logs.length, 3);
  assert.ok(logs.every(log => log.status === 'accepted'));
  console.log('Admin notification checks passed: quote and booking routing, separate customer acknowledgement, delivery logs, deduplication and fixture guard. No real email sent.');
} finally {
  if (bookingId) await db.execute('DELETE FROM bookings WHERE id = ? AND reference = ?', [bookingId, `B-AN-${suffix}`]);
  if (quoteId) await db.execute('DELETE FROM quotes WHERE id = ? AND reference = ?', [quoteId, `Q-AN-${suffix}`]);
  if (customerId) await db.execute('DELETE FROM customers WHERE id = ? AND contact_key IS NOT NULL', [customerId]);
  await db.end();
}
