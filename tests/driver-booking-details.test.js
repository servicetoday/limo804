import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { driverBookingToken } from '../lib/driver-booking-token.js';

let row, quote, queries, quoteReads;
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export {}', shortCircuit: true };
  if (context.parentURL?.endsWith('/lib/driver-booking-details.js') && specifier === './quotes') {
    return { url: 'data:text/javascript,export async function getQuote() { return globalThis.driverDetailsQuote(); }', shortCircuit: true };
  }
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && /^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.js`, context);
    throw error;
  }
} });
globalThis.limoDb = { async execute(sql, params) { queries++; assert.deepEqual(params, ['42']); return [[row].filter(Boolean)]; } };
globalThis.driverDetailsQuote = () => { quoteReads++; return quote; };
const { getDriverBookingDetails } = await import('../lib/driver-booking-details.js');
const oldSecret = process.env.DRIVER_BOOKING_LINK_SECRET;

test.beforeEach(() => {
  process.env.DRIVER_BOOKING_LINK_SECRET = 'details-test-secret';
  queries = 0; quoteReads = 0;
  row = { id: 42, quote_id: 9, assigned_driver_id: 7, driver_assignment_version: 3, status: 'confirmed', reference: 'B-TEST', driver_name: 'Test Driver', total_amount: '100.00', currency: 'AUD', vehicle_name: 'Test Sedan' };
  quote = { passenger_snapshot: { displayName: 'Test Passenger', countryCode: '+61', mobile: '0411000000' }, customer_snapshot: { email: 'private@example.invalid' }, emails: [{ secret: 'mail log' }], history: [{ note: 'admin only' }], journeys: [{ sequence_number: 1, pickup_location: 'Sydney Airport', pickup_local_date: null, pickup_local_time: null, timing_source: 'flight', arriving_flight: 'QF1', stops: [{ location: 'Mascot' }] }] };
});
test.after(() => {
  if (oldSecret === undefined) delete process.env.DRIVER_BOOKING_LINK_SECRET; else process.env.DRIVER_BOOKING_LINK_SECRET = oldSecret;
  delete globalThis.limoDb; delete globalThis.driverDetailsQuote;
});

test('valid link returns driver details including journeys while excluding admin data', async () => {
  const details = await getDriverBookingDetails(driverBookingToken(row, 'details-test-secret'));
  assert.equal(details.reference, 'B-TEST'); assert.equal(details.passengerName, 'Test Passenger');
  assert.equal(details.journeys[0].flightBased, true); assert.equal(details.journeys[0].flight, 'QF1');
  assert.deepEqual(details.journeys[0].stops, ['Mascot']);
  for (const key of ['customer_snapshot', 'emails', 'history', 'quote_id', 'assigned_driver_id']) assert.equal(details[key], undefined);
});

test('invalid, expired and superseded links never read passenger details', async () => {
  await assert.rejects(getDriverBookingDetails('bad'), error => error.status === 404);
  assert.equal(queries, 0);
  const token = driverBookingToken(row, 'details-test-secret');
  row.driver_assignment_version++;
  await assert.rejects(getDriverBookingDetails(token), error => error.status === 404);
  const expired = driverBookingToken(row, 'details-test-secret', 1000000000);
  await assert.rejects(getDriverBookingDetails(expired), error => error.status === 404);
  row = null;
  await assert.rejects(getDriverBookingDetails(token), error => error.status === 404);
  assert.equal(quoteReads, 0);
});
