import test from 'node:test';
import assert from 'node:assert/strict';
import { adminNotificationContent, bookingEmailContent, quoteEmailContent } from '../lib/quote-email-template.js';
import { adminNotificationEmail, isSyntheticNotification } from '../lib/notification-settings.js';

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

test('admin quote and booking alerts include passenger contacts and journey details', () => {
  const quote = { reference: 'Q-ADMIN', passenger_snapshot: { displayName: 'Alex <Lee>', email: 'alex@example.com', countryCode: '+61', mobile: '0412345678' }, customer_snapshot: { displayName: 'Booker', email: 'booker@example.com' }, chauffeur_note: 'Please call on arrival', journeys: [{ pickup_location: 'Airport', dropoff_location: 'Hotel', timing_source: 'flight', arriving_flight: 'EK412', passengers: 3, stops: [{ sequence_number: 1, location: 'Mascot' }] }], booking: { reference: 'B-ADMIN', status: 'confirmed', currency: 'AUD', total_amount: '150.00' } };
  const received = adminNotificationContent(quote);
  assert.match(received.subject, /New quote request Q-ADMIN/);
  for (const value of ['alex@example.com', 'booker@example.com', '0412345678', 'Stop 1: Mascot', 'Passengers: 3', 'Please call on arrival']) assert.ok(received.text.includes(value));
  assert.ok(received.html.includes('Alex &lt;Lee&gt;'));
  const booked = adminNotificationContent(quote, true);
  assert.match(booked.subject, /New confirmed booking B-ADMIN/);
  assert.match(booked.text, /AUD 150.00/);
  assert.equal(adminNotificationEmail, 'admin@limo804.com.au');
});

test('automatic admin alerts skip synthetic fixtures', () => {
  assert.equal(isSyntheticNotification({ customer_reference: 'DUMMY-TEST', customer_snapshot: { email: 'person@example.com' } }), true);
  assert.equal(isSyntheticNotification({ customer_snapshot: { email: 'test@example.invalid' } }), true);
  assert.equal(isSyntheticNotification({ customer_snapshot: { email: 'person@example.com' } }), false);
});
