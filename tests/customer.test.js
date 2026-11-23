import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCustomer } from '../app/quote/customer.js';

const customer = { firstName: 'Alex', lastName: 'Lee', countryCode: '+61', mobile: '0412 345 678', email: 'alex@example.com', someoneElse: false };

test('accepts customer contact details without requiring optional extras', () => {
  assert.equal(validateCustomer(customer), null);
});
test('rejects whitespace-only names', () => {
  assert.equal(validateCustomer({ ...customer, firstName: '   ' }).field, 'firstName');
  assert.equal(validateCustomer({ ...customer, lastName: '   ' }).field, 'lastName');
});
test('rejects invalid mobile numbers and email addresses', () => {
  assert.equal(validateCustomer({ ...customer, mobile: 'abc123' }).field, 'mobile');
  assert.equal(validateCustomer({ ...customer, mobile: '123' }).field, 'mobile');
  assert.equal(validateCustomer({ ...customer, email: 'alex@' }).field, 'email');
});
test('requires booker contact details only for third-party bookings', () => {
  assert.equal(validateCustomer({ ...customer, someoneElse: true }).field, 'bookerName');
  assert.equal(validateCustomer({ ...customer, someoneElse: true, bookerName: 'Taylor' }).field, 'bookerEmail');
  assert.equal(validateCustomer({ ...customer, someoneElse: true, bookerName: 'Taylor', bookerEmail: 'taylor@example.com' }), null);
});
