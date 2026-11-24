import test from 'node:test';
import assert from 'node:assert/strict';
import { isAirportPickup, validateJourneys } from '../app/quote/booking.js';

const now = new Date('2030-01-01T09:00');
const first = { id: 4, pickup: 'Sydney Airport', dropoff: 'Sydney CBD', date: '2030-01-02', time: '10:00', passengers: 1 };
const second = { id: 9, pickup: 'Parramatta', dropoff: 'Manly', date: '2030-01-03', time: '15:30', passengers: 4 };

test('accepts independently scheduled trips with different passenger counts', () => {
  assert.equal(validateJourneys([first, second], { now }), null);
});
test('identifies an incomplete second trip by its stable ID', () => {
  assert.deepEqual(validateJourneys([first, { ...second, pickup: '   ' }], { now }), { id: 9, field: 'pickup', message: 'Please enter a pick-up location.' });
});
test('validates collapsed trips as well as expanded trips', () => {
  const error = validateJourneys([first, { ...second, time: '', collapsed: true }], { now });
  assert.equal(error.id, 9);
  assert.equal(error.field, 'time');
});
test('rejects matching locations regardless of spaces or letter case', () => {
  assert.equal(validateJourneys([{ ...first, dropoff: ' sydney AIRPORT ' }], { now }).field, 'dropoff');
});
test('rejects a past departure on an additional trip', () => {
  assert.equal(validateJourneys([first, { ...second, date: '2029-12-31' }], { now }).id, 9);
});
test('preserves hourly bookings without a drop-off', () => {
  assert.equal(validateJourneys([{ ...first, dropoff: '' }], { hourly: true, now }), null);
});
test('requires the return journey to follow the outbound departure', () => {
  assert.equal(validateJourneys([first], { now, returnDate: '2030-01-02', returnTime: '09:30' }).field, 'returnTime');
  assert.equal(validateJourneys([first], { now, returnDate: '2030-01-02', returnTime: '11:30' }), null);
});

test('recognises airport pickups without matching unrelated words', () => {
  assert.equal(isAirportPickup('Sydney Airport (SYD), Mascot'), true);
  assert.equal(isAirportPickup('SYD international terminal'), true);
  assert.equal(isAirportPickup('Sydney CBD'), false);
});
test('requires a flight reference when deferring airport timing', () => {
  const flight = { ...first, date: '', time: '', flightScheduled: true };
  assert.equal(validateJourneys([flight], { now }).field, 'flightNumber');
  assert.equal(validateJourneys([{ ...flight, flightNumber: 'EK412' }], { now }), null);
});
test('requires manual timing when the arriving flight is unknown', () => {
  assert.equal(validateJourneys([{ ...first, date: '', flightScheduled: false }], { now }).field, 'date');
});
test('validates added stops and their relationship to surrounding locations', () => {
  assert.equal(validateJourneys([{ ...first, stops: [{ id: 'a', location: '' }] }], { now }).field, 'stop-a');
  assert.equal(validateJourneys([{ ...first, stops: [{ id: 'a', location: 'Sydney Airport' }] }], { now }).field, 'stop-a');
  assert.equal(validateJourneys([{ ...first, stops: [{ id: 'a', location: 'Sydney CBD' }] }], { now }).field, 'dropoff');
  assert.equal(validateJourneys([{ ...first, stops: [{ id: 'a', location: 'Surry Hills' }] }], { now }), null);
});

test('invalid waiting on a collapsed trip identifies the field that needs expanding', () => {
  const error = validateJourneys([first, { ...second, collapsed: true, waitingMinutes: -1 }], { now });
  assert.equal(error.id, second.id);
  assert.equal(error.field, 'waitingMinutes');
});
