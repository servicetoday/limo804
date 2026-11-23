import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingEmailContent, quoteEmailContent } from '../lib/quote-email-template.js';

test('quote email includes ordered stops and clearly marks the dummy request', () => {
  const quote = { reference: 'Q-TEST', customer_reference: 'DUMMY-SYDNEY-AIRPORT', journeys: [{ pickup_location: 'Sydney Airport', dropoff_location: '80 George Street', pickup_local_date: '2026-11-30', pickup_local_time: '10:00:00', passengers: 2, timing_source: 'manual', stops: [{ sequence_number: 1, location: 'Mascot' }, { sequence_number: 2, location: 'Surry Hills' }] }], quoted_total: null };
  const email = quoteEmailContent(quote);
  assert.match(email.subject, /^\[TEST\]/);
  assert.ok(email.text.indexOf('Stop 1: Mascot') < email.text.indexOf('Stop 2: Surry Hills'));
  assert.ok(email.text.includes('80 George Street'));
  assert.ok(email.text.includes('does not confirm a booking'));
  quote.journeys[0].pickup_location = '<script>alert(1)</script>';
  assert.ok(!quoteEmailContent(quote).html.includes('<script>'));
});

test('pending booking email shows its reference, price and pending status', () => {
  const quote = { reference: 'q-23112026-AB12', customer_reference: 'DUMMY-TEST', duration_hours: 4, journeys: [{ pickup_location: '80 George Street', pickup_local_date: '2026-11-30', pickup_local_time: '10:00:00', passengers: 2, timing_source: 'manual', stops: [] }], booking: { reference: 'B-TEST', status: 'pending', currency: 'AUD', total_amount: '400.00' } };
  const email = bookingEmailContent(quote);
  assert.ok(email.subject.includes('[TEST]'));
  for (const text of ['B-TEST', 'PENDING', 'AUD 400.00', '4 hours', 'not confirmed']) assert.ok(email.text.includes(text));
  assert.throws(() => bookingEmailContent({}), /No booking/);
});
