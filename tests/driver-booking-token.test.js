import test from 'node:test';
import assert from 'node:assert/strict';
import { driverBookingToken, driverBookingTokenId, verifyDriverBookingToken } from '../lib/driver-booking-token.js';

const booking = { id: 42, assigned_driver_id: 7, driver_assignment_version: 3, status: 'confirmed' };
const now = new Date('2030-01-01T00:00:00Z').getTime();
const expiry = Math.floor(now / 1000) + 3600;

test('driver link is signed and binds booking, driver, assignment version and expiry', () => {
  const token = driverBookingToken(booking, 'test-secret', expiry);
  assert.equal(driverBookingTokenId(token), '42');
  assert.equal(verifyDriverBookingToken(token, booking, 'test-secret', now), true);
  for (const change of [{ id: 43 }, { assigned_driver_id: 8 }, { driver_assignment_version: 4 }, { assigned_driver_id: null }, { status: 'cancelled' }, { status: 'completed' }]) {
    assert.equal(verifyDriverBookingToken(token, { ...booking, ...change }, 'test-secret', now), false);
  }
  assert.equal(verifyDriverBookingToken(token, booking, 'wrong-secret', now), false);
  assert.equal(verifyDriverBookingToken(token, booking, 'test-secret', expiry * 1000), false);
  assert.equal(verifyDriverBookingToken(token.replace(`.${expiry}.`, `.${expiry + 100}.`), booking, 'test-secret', now), false);
});

test('malformed links cannot resolve a booking or pass verification', () => {
  for (const token of ['', '42', null, '42.3.9999999999.bad', '../42', '0.0.9999999999.' + 'a'.repeat(43), '1'.repeat(10000)]) {
    assert.equal(driverBookingTokenId(token), null);
    assert.equal(verifyDriverBookingToken(token, booking, 'test-secret', now), false);
  }
  assert.throws(() => driverBookingToken(booking, ''), /not configured/);
  assert.throws(() => driverBookingToken({ ...booking, assigned_driver_id: null }, 'secret'), /Assign a driver/);
});
