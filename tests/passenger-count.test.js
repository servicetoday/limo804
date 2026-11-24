import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePassengerUpdate, checkPassengerCapacity } from '../lib/passenger-count.js';

test('passenger counts accept dropdown values and require valid journey IDs', () => {
  assert.deepEqual(validatePassengerUpdate({ journeyId: '12', passengers: '7', previousPassengers: 1 }), { journeyId: 12, passengers: 7, previousPassengers: 1 });
  for (const passengers of [0, 8, -1, 1.5, '', null, true, [], {}]) assert.throws(() => validatePassengerUpdate({ journeyId: 12, passengers, previousPassengers: 1 }), /1 and 7/);
  for (const journeyId of [0, -1, true, [], null, 4294967296]) assert.throws(() => validatePassengerUpdate({ journeyId, passengers: 2, previousPassengers: 1 }), /journey ID/);
  assert.throws(() => validatePassengerUpdate({ journeyId: 12, passengers: 2 }), /Refresh/);
});

test('passenger counts respect vehicle capacity', () => {
  assert.doesNotThrow(() => checkPassengerCapacity(3, 3));
  assert.doesNotThrow(() => checkPassengerCapacity(7, null));
  assert.throws(() => checkPassengerCapacity(4, 3), /space for 3/);
});
