import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFleet } from '../lib/fleet-validation.js';

const vehicle = { name: 'Executive Sedan', category: 'sedan', passengers: 3, suitcases: 3, image: '/images/fleet-sedan.jpg', description: 'A private chauffeured sedan.', features: ['Airport transfers'], isActive: false, sortOrder: 0 };
test('normalizes vehicle input for database storage', () => {
  const result = validateFleet({ ...vehicle, name: ' Executive Sedan ', passengers: '3' });
  assert.equal(result.name, 'Executive Sedan'); assert.equal(result.passengers, 3); assert.equal(result.isActive, false);
});
test('requires a name and description', () => {
  assert.throws(() => validateFleet({ ...vehicle, name: ' ' }), /name is required/);
  assert.throws(() => validateFleet({ ...vehicle, description: '' }), /description is required/);
});
test('restricts categories and capacity ranges', () => {
  assert.throws(() => validateFleet({ ...vehicle, category: 'bus' }), /Sedans or Luxury SUVs/);
  for (const passengers of [0, 8, 2.5, '', null, true]) assert.throws(() => validateFleet({ ...vehicle, passengers }));
  assert.throws(() => validateFleet({ ...vehicle, suitcases: -1 }));
});
test('rejects unsafe image paths and protocols', () => {
  for (const image of ['javascript:alert(1)', 'http://example.com/a.jpg', '/images/../secrets', '//example.com/a.jpg', '/etc/passwd']) assert.throws(() => validateFleet({ ...vehicle, image }));
  assert.equal(validateFleet({ ...vehicle, image: 'https://example.com/car.jpg' }).image, 'https://example.com/car.jpg');
});
test('requires explicit publication state and bounded feature lists', () => {
  assert.throws(() => validateFleet({ ...vehicle, isActive: 'false' }));
  assert.throws(() => validateFleet({ ...vehicle, features: Array(11).fill('feature') }));
});
