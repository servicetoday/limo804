import test from 'node:test';
import assert from 'node:assert/strict';
import { createBookingReference, insertWithBookingReference } from '../lib/booking-reference.js';

test('booking references use the Sydney calendar date and exactly four numeric digits', () => {
  for (let i = 0; i < 100; i++) assert.match(createBookingReference(new Date('2026-11-25T14:30:00Z')), /^B-20261126-\d{4}$/);
  assert.match(createBookingReference(new Date('2026-01-05T00:00:00Z')), /^B-20260105-\d{4}$/);
  assert.match(createBookingReference(new Date('2026-06-01T13:30:00Z')), /^B-20260601-\d{4}$/);
});

test('booking reference collisions retry with a new suffix', async () => {
  const references = ['B-20261126-0001', 'B-20261126-1234'];
  const tried = [];
  const result = await insertWithBookingReference(async reference => {
    tried.push(reference);
    if (tried.length === 1) throw Object.assign(new Error(), { code: 'ER_DUP_ENTRY', sqlMessage: "Duplicate entry for key 'bookings.reference'" });
    return 42;
  }, () => references.shift());
  assert.deepEqual(result, { id: 42, reference: 'B-20261126-1234' });
  assert.deepEqual(tried, ['B-20261126-0001', 'B-20261126-1234']);
});

test('booking reference retries preserve other database errors', async () => {
  const error = Object.assign(new Error('Duplicate booking for quote'), { code: 'ER_DUP_ENTRY', sqlMessage: "Duplicate entry for key 'bookings.quote_id'" });
  let attempts = 0;
  await assert.rejects(insertWithBookingReference(async () => { attempts++; throw error; }), result => result === error);
  assert.equal(attempts, 1);
});
