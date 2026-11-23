import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, unlink } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const base = 'http://localhost:3000'; const token = randomUUID();
const email = `quote-test-${token}@example.invalid`; const bookerEmail = `booker-test-${token}@example.invalid`;
let cookie = ''; const keys = [];
async function req(url, options = {}, admin = false) { return fetch(base + url, { ...options, headers: { Origin: base, ...(admin ? { Cookie: cookie } : {}), ...options.headers } }); }
const json = (method, data) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
function input() {
  const key = randomUUID(); keys.push(key);
  return { submissionKey: key, trip: { service: 'transfer', journey: 'one-way', legs: [{ pickup: 'Sydney Airport', dropoff: 'Sydney CBD', date: '2099-01-02', time: '10:00', passengers: 2, stops: [{ location: 'Mascot Hotel' }, { location: 'Surry Hills' }] }], flightText: 'Synthetic test itinerary' }, customer: { firstName: 'API Test', lastName: token, email, countryCode: '+61', mobile: '0412 345 678', someoneElse: false, signName: 'Test sign', chauffeurNote: 'Synthetic test note', reference: 'Test reference', voucher: 'UNVERIFIED' } };
}
async function detail(id) { const r = await req(`/api/admin/quotes/${id}`, {}, true); assert.equal(r.status, 200); return (await r.json()).quote; }
const c = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME });
try {
  assert.equal((await req('/api/admin/quotes')).status, 401);
  assert.equal((await fetch(base + '/admin/quotes', { redirect: 'manual' })).status, 307);
  assert.equal((await req('/api/quotes', json('POST', {}))).status, 400);
  const crossSite = await req('/api/quotes', { ...json('POST', {}), headers: { Origin: 'https://other.example', 'Content-Type': 'application/json' } }); assert.equal(crossSite.status, 403);
  const login = await req('/api/admin/auth/login', json('POST', { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD })); assert.equal(login.status, 200); cookie = login.headers.get('set-cookie').split(';')[0];
  const first = input();
  const fleet = (await (await req('/api/fleet')).json()).vehicles.find(item => item.passengers >= 2);
  if (fleet) Object.assign(first.trip, { fleetId: fleet.id, vehiclePreference: fleet.category, fleetName: 'Forged name to ignore' });
  first.status = 'accepted'; first.quoted_total = 1;
  const upload = new FormData(); upload.set('payload', JSON.stringify(first)); upload.set('attachment', new File([await readFile('public/images/fleet-sedan.jpg')], 'test-itinerary.jpg', { type: 'image/jpeg' }));
  const created = await req('/api/quotes', { method: 'POST', body: upload });
  assert.equal(created.status, 201, await created.clone().text()); const receipt = await created.json(); assert.match(receipt.reference, /^q-\d{8}-[A-Z0-9]{4}$/); assert.equal(receipt.status, 'submitted');
  let list = (await (await req('/api/admin/quotes', {}, true)).json()).quotes;
  const id = list.find(item => item.reference === receipt.reference).id;
  let quote = await detail(id); assert.equal(quote.status, 'submitted'); assert.equal(quote.quoted_total, null); assert.equal(quote.passenger_id, quote.customer_id); assert.equal(quote.journeys.length, 1); assert.equal(quote.journeys[0].stops.length, 2); assert.equal(quote.pickup_sign_name, 'Test sign'); assert.equal(quote.voucher_code, 'UNVERIFIED'); assert.equal(quote.attachments.length, 1);
  if (fleet) assert.equal(quote.vehicle_name_snapshot, fleet.name);
  const filePath = `/api/admin/quotes/${id}/attachments/${quote.attachments[0].id}`;
  assert.equal((await req(filePath)).status, 401); assert.equal((await req(filePath, {}, true)).status, 200);
  const retry = new FormData(); retry.set('payload', JSON.stringify(first)); retry.set('attachment', new File([await readFile('public/images/fleet-sedan.jpg')], 'test-itinerary.jpg', { type: 'image/jpeg' }));
  const replay = await req('/api/quotes', { method: 'POST', body: retry }); assert.equal(replay.status, 200); assert.equal((await replay.json()).reference, receipt.reference);
  const conflict = structuredClone(first); conflict.customer.signName = 'Changed'; assert.equal((await req('/api/quotes', json('POST', conflict))).status, 409);
  assert.equal((await req(`/api/admin/quotes/${id}/convert`, { method: 'POST' }, true)).status, 409);
  assert.equal((await req(`/api/admin/quotes/${id}`, json('PATCH', { status: 'accepted', quotedTotal: '150' }), true)).status, 409);
  assert.equal((await req(`/api/admin/quotes/${id}`, json('PATCH', { status: 'quoted', quotedTotal: '150.50', note: 'Synthetic quote price' }), true)).status, 200);
  assert.equal((await req(`/api/admin/quotes/${id}`, json('PATCH', { status: 'accepted', quotedTotal: '150.50', note: 'Synthetic acceptance' }), true)).status, 200);
  const conversions = await Promise.all([req(`/api/admin/quotes/${id}/convert`, { method: 'POST' }, true), req(`/api/admin/quotes/${id}/convert`, { method: 'POST' }, true)]);
  const bookingA = (await conversions[0].json()).booking; const bookingB = (await conversions[1].json()).booking;
  assert.ok(bookingA); assert.equal(bookingA.id, bookingB.id); assert.equal(bookingA.status, 'pending');
  quote = await detail(id); assert.equal(quote.status, 'converted'); assert.equal(quote.booking.total_amount, '150.50'); assert.equal(quote.history.length, 4);
  assert.equal((await req(`/api/admin/quotes/${id}`, json('PATCH', { status: 'submitted' }), true)).status, 409);
  assert.ok((await (await req(`/admin/quotes/${id}`, {}, true)).text()).includes(receipt.reference));
  const returnRequest = input(); Object.assign(returnRequest.trip, { journey: 'return', returnDate: '2099-01-03', returnTime: '15:30' }); returnRequest.trip.legs[0].stops = [];
  Object.assign(returnRequest.customer, { someoneElse: true, bookerName: 'Synthetic Booker', bookerEmail });
  const returnSaved = await req('/api/quotes', json('POST', returnRequest)); assert.equal(returnSaved.status, 201, await returnSaved.clone().text());
  const returnRef = (await returnSaved.json()).reference;
  list = (await (await req('/api/admin/quotes', {}, true)).json()).quotes;
  const returnQuote = await detail(list.find(item => item.reference === returnRef).id);
  assert.notEqual(returnQuote.customer_id, returnQuote.passenger_id); assert.equal(returnQuote.customer_snapshot.email, bookerEmail); assert.equal(returnQuote.journeys.length, 2); assert.equal(returnQuote.journeys[1].pickup_location, 'Sydney CBD');
  const multi = input(); multi.trip.journey = 'multi-trip'; multi.trip.legs[0].stops = []; multi.trip.legs.push({ ...multi.trip.legs[0], date: '2099-01-04', passengers: 5 });
  const simultaneous = await Promise.all([req('/api/quotes', json('POST', multi)), req('/api/quotes', json('POST', multi))]);
  const multiA = await simultaneous[0].json(); const multiB = await simultaneous[1].json(); assert.ok(multiA.reference, JSON.stringify(multiA)); assert.equal(multiA.reference, multiB.reference);
  const [multiRows] = await c.execute('SELECT id FROM quotes WHERE submission_key = ?', [multi.submissionKey]); assert.equal(multiRows.length, 1); const multiQuote = await detail(multiRows[0].id); assert.equal(multiQuote.journeys[1].passengers, 5);
  const flight = input(); Object.assign(flight.trip.legs[0], { flightScheduled: true, flightNumber: 'EK412', date: '', time: '' });
  assert.equal((await req('/api/quotes', json('POST', flight))).status, 201);
  const hourly = input(); hourly.trip.service = 'hourly'; hourly.trip.hours = 4; hourly.trip.legs[0].stops = [];
  assert.equal((await req('/api/quotes', json('POST', hourly))).status, 201);
  const rejected = input(); rejected.trip.fleetId = 4294967295;
  assert.equal((await req('/api/quotes', json('POST', rejected))).status, 400);
  const [absent] = await c.execute('SELECT id FROM quotes WHERE submission_key = ?', [rejected.submissionKey]); assert.equal(absent.length, 0);
  console.log('PASS: relational quote persistence, customer/booker snapshots, ordered stops, return/multi-trip/hourly/flight journeys, private attachments, fleet validation, server-controlled status/pricing, duplicate/retry protection, admin pages, audit history and one-time pending booking conversion.');
} finally {
  for (const key of keys) {
    const [rows] = await c.execute('SELECT id FROM quotes WHERE submission_key = ?', [key]);
    for (const row of rows) {
      const [files] = await c.execute('SELECT storage_name FROM quote_attachments WHERE quote_id = ?', [row.id]);
      await c.execute('DELETE FROM bookings WHERE quote_id = ?', [row.id]);
      await c.execute('DELETE FROM quotes WHERE id = ?', [row.id]);
      for (const file of files) if (/^[a-f0-9]{32}\.(jpg|png|pdf|webp|heic)$/.test(file.storage_name)) await unlink('storage/quotes/' + file.storage_name);
    }
  }
  await c.execute('DELETE FROM customers WHERE email IN (?, ?) AND id NOT IN (SELECT customer_id FROM quotes UNION SELECT passenger_id FROM quotes)', [email, bookerEmail]);
  await c.end();
}
