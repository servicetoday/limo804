import test from 'node:test';
import assert from 'node:assert/strict';
import { sydneyPickup, validateQuote, validateQuoteUpdate } from '../lib/quote-validation.js';
const now = new Date('2030-01-01T00:00:00Z');
function payload() { return { submissionKey: 'd9345316-d4f1-4e08-b5e6-e23a0e871899', trip: { service: 'transfer', journey: 'one-way', legs: [{ pickup: 'Sydney Airport', dropoff: 'Sydney CBD', date: '2030-01-02', time: '10:00', passengers: 3, stops: [] }] }, customer: { firstName: 'Alex', lastName: 'Lee', email: 'ALEX@example.com', countryCode: '+61', mobile: '0412 345 678', someoneElse: false } }; }
test('normalizes customers and Sydney pickup times server-side', () => {
  const result = validateQuote(payload(), now);
  assert.equal(result.customer.passenger.email, 'alex@example.com');
  assert.equal(result.legs[0].utc, '2030-01-01 23:00:00');
  assert.equal(result.customer.booker, result.customer.passenger);
});
test('Sydney dates use daylight saving rather than the server timezone', () => {
  assert.equal(sydneyPickup('2030-01-02', '10:00').toISOString(), '2030-01-01T23:00:00.000Z');
  assert.equal(sydneyPickup('2030-07-02', '10:00').toISOString(), '2030-07-02T00:00:00.000Z');
  assert.throws(() => sydneyPickup('2030-02-30', '10:00'));
  assert.throws(() => sydneyPickup('2030-10-06', '02:30'));
});
test('return journeys are stored as separate reversed legs', () => {
  const raw = payload(); Object.assign(raw.trip, { journey: 'return', returnDate: '2030-01-04', returnTime: '15:00' });
  const result = validateQuote(raw, now);
  assert.equal(result.legs.length, 2); assert.equal(result.legs[1].legType, 'return');
  assert.equal(result.legs[1].pickup, 'Sydney CBD'); assert.equal(result.legs[1].dropoff, 'Sydney Airport');
  raw.trip.returnDate = '2030-01-01'; assert.throws(() => validateQuote(raw, now), /Return pick-up/);
});
test('multi-trip journeys retain independent schedules and passenger counts', () => {
  const raw = payload(); raw.trip.journey = 'multi-trip'; raw.trip.legs.push({ ...raw.trip.legs[0], date: '2030-01-05', passengers: 5 });
  const result = validateQuote(raw, now); assert.equal(result.legs[1].passengers, 5); assert.equal(result.legs[1].date, '2030-01-05');
});
test('stops retain their order and reject blank or duplicate adjacent locations', () => {
  const raw = payload(); raw.trip.legs[0].stops = [{ location: 'Mascot' }, { location: 'Surry Hills' }];
  assert.deepEqual(validateQuote(raw, now).legs[0].stops, ['Mascot', 'Surry Hills']);
  raw.trip.legs[0].stops[1].location = 'mascot'; assert.throws(() => validateQuote(raw, now), /Adjacent/);
});
test('flight-based timing is accepted only for valid airport arrivals', () => {
  const raw = payload(); Object.assign(raw.trip.legs[0], { date: '', time: '', flightScheduled: true, flightNumber: 'EK412' });
  assert.equal(validateQuote(raw, now).legs[0].utc, null);
  raw.trip.legs[0].pickup = 'Sydney hotel'; assert.throws(() => validateQuote(raw, now), /arriving flight/);
});
test('booker and passenger remain separate for third-party enquiries', () => {
  const raw = payload(); Object.assign(raw.customer, { someoneElse: true, bookerName: 'Taylor Jones', bookerEmail: 'taylor@example.com' });
  const result = validateQuote(raw, now); assert.equal(result.customer.booker.displayName, 'Taylor Jones'); assert.equal(result.customer.passenger.displayName, 'Alex Lee');
});
test('hourly journeys require duration and do not require a destination', () => {
  const raw = payload(); raw.trip.service = 'hourly'; raw.trip.hours = '4'; delete raw.trip.legs[0].dropoff;
  assert.equal(validateQuote(raw, now).hours, 4); assert.equal(validateQuote(raw, now).legs[0].dropoff, null);
  raw.trip.hours = 0; assert.throws(() => validateQuote(raw, now), /Duration/);
});
test('rejects malformed payloads, past dates, oversize text and invalid capacities', () => {
  for (const value of [null, [], {}, { submissionKey: 'bad' }]) assert.throws(() => validateQuote(value, now));
  const raw = payload(); raw.trip.legs[0].passengers = 100; assert.throws(() => validateQuote(raw, now));
  raw.trip.legs[0].passengers = 1; raw.customer.firstName = 'a'.repeat(101); assert.throws(() => validateQuote(raw, now));
  raw.customer.firstName = 'Alex'; raw.trip.legs[0].date = '2020-01-01'; assert.throws(() => validateQuote(raw, now), /future/);
});
test('price and status transitions require proper sequence and money precision', () => {
  assert.throws(() => validateQuoteUpdate({ status: 'accepted', quotedTotal: '100' }, { status: 'submitted', quoted_total: null }), /not allowed/);
  assert.throws(() => validateQuoteUpdate({ status: 'quoted' }, { status: 'submitted', quoted_total: null }), /total/);
  assert.throws(() => validateQuoteUpdate({ status: 'quoted', quotedTotal: '12.345' }, { status: 'submitted', quoted_total: null }), /AUD/);
  assert.equal(validateQuoteUpdate({ status: 'quoted', quotedTotal: '120.50' }, { status: 'submitted', quoted_total: null }).amount, '120.50');
  assert.throws(() => validateQuoteUpdate({ status: 'accepted', quotedTotal: '300' }, { status: 'accepted', quoted_total: '120.50' }), /accepted price/);
  assert.throws(() => validateQuoteUpdate({ status: 'submitted' }, { status: 'converted', quoted_total: '120.50' }), /not allowed/);
});
