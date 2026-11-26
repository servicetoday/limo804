// Run after starting the app: node --conditions=react-server scripts/test-driver-booking-links.mjs
// Uses isolated, cleaned-up fixtures. No emails or SMS are sent.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { registerHooks } from 'node:module';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
registerHooks({ resolve(specifier, context, nextResolve) {
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && /^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.js`, context);
    throw error;
  }
} });
const { db } = await import('../lib/db.js');
const { saveDriver } = await import('../lib/drivers.js');
const { submitQuote, updateQuote, convertQuote } = await import('../lib/quotes.js');
const { assignBookingDriver } = await import('../lib/booking-assignments.js');
const { driverBookingUrl, driverBookingToken } = await import('../lib/driver-booking-token.js');
const { getDriverBookingDetails } = await import('../lib/driver-booking-details.js');
const token = randomUUID(), email = `driver-link-${token}@example.invalid`;
const origin = process.env.DRIVER_LINK_TEST_ORIGIN || 'http://localhost:3002';
let driverId, quoteId, bookingId;
try {
  const driver = await saveDriver({ name: `TEST LINK DRIVER ${token}`, phone: '0411573341', assignedFleetId: null });
  driverId = driver.id;
  const receipt = await submitQuote({ submissionKey: token, trip: { service: 'transfer', journey: 'one-way', legs: [{ pickup: 'Sydney Airport', dropoff: 'Sydney CBD', date: '2099-01-02', time: '10:00', passengers: 2, stops: [{ location: 'Mascot' }] }] }, customer: { firstName: 'Test', lastName: 'Link Passenger', email, countryCode: '+61', mobile: '0000000000', someoneElse: false, reference: 'DUMMY-DRIVER-LINK', chauffeurNote: 'TEST ONLY - do not dispatch' } }, null);
  const [quotes] = await db.execute('SELECT id FROM quotes WHERE reference = ?', [receipt.reference]);
  quoteId = quotes[0].id;
  await updateQuote(quoteId, { status: 'quoted', quotedTotal: '100' });
  await updateQuote(quoteId, { status: 'accepted' });
  const created = await convertQuote(quoteId); bookingId = created.id;
  await assignBookingDriver(bookingId, driverId, null);
  const [bookings] = await db.execute('SELECT * FROM bookings WHERE id = ?', [bookingId]);
  const booking = bookings[0], url = driverBookingUrl(booking), signedToken = url.split('/').at(-1);
  const details = await getDriverBookingDetails(signedToken);
  assert.equal(details.reference, created.reference); assert.equal(details.passengerName, 'Test Link Passenger');
  assert.equal(details.journeys[0].stops[0], 'Mascot');
  const response = await fetch(`${origin}/driver/booking/${signedToken}`, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.match(response.headers.get('x-robots-tag'), /noindex/);
  const html = await response.text();
  for (const content of ['Test Link Passenger', 'Sydney Airport', 'Mascot', 'Chauffeur notes', 'TEST BOOKING']) assert.ok(html.includes(content), `Missing ${content}`);
  assert.ok(!html.includes(email), 'Customer email must not be exposed');
  const expired = driverBookingToken(booking, process.env.DRIVER_BOOKING_LINK_SECRET || process.env.ADMIN_SESSION_SECRET, 1000000000);
  assert.equal((await fetch(`${origin}/driver/booking/${expired}`)).status, 404);
  await assignBookingDriver(bookingId, null, null);
  await assert.rejects(getDriverBookingDetails(signedToken), error => error.status === 404);
  const revoked = await fetch(`${origin}/driver/booking/${signedToken}`);
  assert.equal(revoked.status, 404);
  assert.ok(!(await revoked.text()).includes('Test Link Passenger'));
  console.log('PASS: real database fixture, booking page rendering, passenger details, private headers, expiry and unassignment revocation. No messages sent.');
} finally {
  if (bookingId) await db.execute('DELETE FROM bookings WHERE id = ?', [bookingId]);
  if (quoteId) await db.execute('DELETE FROM quotes WHERE id = ?', [quoteId]);
  await db.execute('DELETE FROM customers WHERE email = ? AND id NOT IN (SELECT customer_id FROM quotes UNION SELECT passenger_id FROM quotes)', [email]);
  if (driverId) await db.execute('DELETE FROM drivers WHERE id = ?', [driverId]);
  await db.end();
}
