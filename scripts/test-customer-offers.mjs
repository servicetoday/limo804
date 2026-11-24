import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const base = 'http://localhost:3000'; const marker = randomUUID(); const email = `offer-test-${marker}@example.invalid`;
const quoteIds = []; let cookie = '';
const c = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME });
const json = (method, data) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
async function req(url, options = {}, admin = false) { return fetch(url.startsWith('http') ? url : base + url, { ...options, headers: { Origin: base, ...(admin ? { Cookie: cookie } : {}), ...options.headers } }); }
async function create() {
  const payload = { submissionKey: randomUUID(), trip: { service: 'transfer', journey: 'one-way', legs: [{ pickup: 'Sydney Airport', dropoff: '80 George Street', date: '2099-01-02', time: '10:00', passengers: 2, stops: [] }] }, customer: { firstName: 'Offer Test', lastName: marker, email, countryCode: '+61', mobile: '0400 000 000', someoneElse: false, reference: 'DUMMY-OFFER-TEST' } };
  const r = await req('/api/quotes', json('POST', payload)); assert.equal(r.status, 201, await r.clone().text()); const saved = await r.json();
  const [rows] = await c.execute('SELECT id FROM quotes WHERE reference = ?', [saved.reference]); quoteIds.push(rows[0].id); return rows[0].id;
}
async function prepare(id, amount) {
  const r = await req(`/api/admin/quotes/${id}/offer`, json('POST', { amount, recipient: email, sendEmail: false }), true);
  assert.equal(r.status, 200, await r.clone().text()); const data = await r.json(); assert.equal(data.emailStatus, 'not_sent'); return data.offer;
}
const tokenOf = offer => new URL(offer.url).pathname.split('/').pop();
const accept = (token, extra = {}) => req('/api/customer/quote/accept', json('POST', { token, accepted: true, ...extra }));
try {
  const login = await req('/api/admin/auth/login', json('POST', { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD })); assert.equal(login.status, 200); cookie = login.headers.get('set-cookie').split(';')[0];
  const id = await create();
  assert.equal((await req(`/api/admin/quotes/${id}/offer`, json('POST', { amount: '150' }))).status, 401);
  assert.equal((await req(`/api/admin/quotes/${id}/offer`, json('POST', { amount: '-1', sendEmail: false }), true)).status, 400);
  const first = await prepare(id, '150.00'); const repeated = await prepare(id, '150.00'); assert.equal(first.id, repeated.id); assert.equal(first.url, repeated.url);
  const html = await (await req(first.url)).text(); assert.ok(html.includes('150.00')); assert.ok(html.includes('80 George Street')); assert.ok(html.includes('Confirm booking'));
  const [before] = await c.execute('SELECT COUNT(*) AS count FROM bookings WHERE quote_id = ?', [id]); assert.equal(before[0].count, 0, 'GET must not create a booking.');
  const forged = tokenOf(first).slice(0, -1) + (tokenOf(first).endsWith('0') ? '1' : '0');
  assert.equal((await req(`/quote/view/${forged}`)).status, 404); assert.equal((await accept(forged)).status, 404);
  assert.equal((await accept(tokenOf(first), { accepted: false })).status, 400);
  const csrf = await req('/api/customer/quote/accept', { ...json('POST', { token: tokenOf(first), accepted: true }), headers: { Origin: 'https://other.example', 'Content-Type': 'application/json' } }); assert.equal(csrf.status, 403);
  await req(`/api/admin/quotes/${id}`, json('PATCH', { status: 'quoted', quotedTotal: '175.50' }), true);
  assert.equal((await accept(tokenOf(first))).status, 409, 'A changed price must invalidate old links.');
  const updated = await prepare(id, '175.50'); assert.notEqual(updated.id, first.id);
  const results = await Promise.all([accept(tokenOf(updated), { amount: '1.00' }), accept(tokenOf(updated))]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 201]);
  const a = await results[0].json(); const b = await results[1].json(); assert.equal(a.booking.reference, b.booking.reference); assert.equal(a.booking.status, 'confirmed'); assert.equal(a.emailStatus, 'not_sent');
  const [bookings] = await c.execute('SELECT * FROM bookings WHERE quote_id = ?', [id]); assert.equal(bookings.length, 1); assert.equal(bookings[0].total_amount, '175.50'); assert.equal(bookings[0].status, 'confirmed'); assert.ok(bookings[0].confirmed_at); assert.equal(bookings[0].assigned_fleet_id, null);
  const [quote] = await c.execute('SELECT status FROM quotes WHERE id = ?', [id]); assert.equal(quote[0].status, 'converted');
  const confirmedHtml = await (await req(updated.url)).text(); assert.ok(confirmedHtml.includes(a.booking.reference));
  const [history] = await c.execute("SELECT * FROM quote_status_history WHERE quote_id = ? AND actor = 'customer' AND to_status IN ('accepted','converted')", [id]); assert.equal(history.length, 2);
  const [fleet] = await c.execute('SELECT id FROM fleet WHERE is_active = TRUE AND deleted_at IS NULL AND passengers >= 2 ORDER BY id LIMIT 1');
  assert.ok(fleet[0], 'Need a published vehicle for the optional vehicle scenario.');
  const vehicleQuote = await create();
  assert.equal((await req(`/api/admin/quotes/${vehicleQuote}`, json('PATCH', { status: 'submitted', preferredFleetId: fleet[0].id }), true)).status, 200);
  const vehicleOffer = await prepare(vehicleQuote, '200.00');
  assert.equal((await req(`/api/admin/quotes/${vehicleQuote}`, json('PATCH', { status: 'quoted', preferredFleetId: null }), true)).status, 200);
  assert.equal((await accept(tokenOf(vehicleOffer))).status, 409, 'Clearing the vehicle must invalidate the previous offer.');
  assert.equal((await req(`/api/admin/quotes/${vehicleQuote}`, json('PATCH', { status: 'quoted', preferredFleetId: fleet[0].id }), true)).status, 200);
  const selectedOffer = await prepare(vehicleQuote, '200.00');
  assert.equal((await accept(tokenOf(selectedOffer))).status, 201);
  const [selectedBookings] = await c.execute('SELECT assigned_fleet_id FROM bookings WHERE quote_id = ?', [vehicleQuote]);
  assert.equal(selectedBookings[0].assigned_fleet_id, fleet[0].id, 'Customer confirmation must carry the selected vehicle into the booking.');
  const expiredId = await create(); const expired = await prepare(expiredId, '200.00'); await c.execute('UPDATE quote_offers SET expires_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE) WHERE id = ?', [expired.id]); assert.equal((await accept(tokenOf(expired))).status, 410); assert.ok((await (await req(expired.url)).text()).includes('quote has expired'));
  const oldId = await create(); const oldOffer = await prepare(oldId, '100.00'); await c.execute('UPDATE quote_journeys SET pickup_at_utc = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY) WHERE quote_id = ?', [oldId]); assert.equal((await accept(tokenOf(oldOffer))).status, 410);
  console.log('PASS: optional quote vehicles, vehicle changes invalidate old offers, selected vehicles carry into customer-confirmed bookings, signed offers, pricing, consent, expiry, CSRF, concurrency and confirmation. No real email was sent.');
} finally {
  for (const id of quoteIds) { await c.execute('DELETE FROM bookings WHERE quote_id = ?', [id]); await c.execute('DELETE FROM quotes WHERE id = ?', [id]); }
  await c.execute('DELETE FROM customers WHERE email = ? AND id NOT IN (SELECT customer_id FROM quotes UNION SELECT passenger_id FROM quotes)', [email]);
  await c.end();
}
