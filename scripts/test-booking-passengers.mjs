// Run with: node --conditions=react-server scripts/test-booking-passengers.mjs
// Isolated database fixtures only. This test never sends notifications.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const { db } = await import('../lib/db.js');
const { saveBookingPassengers } = await import('../lib/booking-passengers.js');
const suffix = randomUUID().slice(0, 8);
let customerId, quoteId, bookingId;
try {
  const [customer] = await db.execute("INSERT INTO customers (contact_key, first_name, last_name, display_name, email, created_at) VALUES (?, 'TEST', 'PASSENGERS', 'TEST PASSENGERS', ?, UTC_TIMESTAMP())", [randomBytes(32).toString('hex'), `passengers-${suffix}@example.invalid`]);
  customerId = customer.insertId;
  const snapshot = JSON.stringify({ displayName: 'TEST PASSENGERS', email: `passengers-${suffix}@example.invalid` });
  const [quote] = await db.execute("INSERT INTO quotes (reference, submission_key, request_hash, customer_id, passenger_id, customer_snapshot, passenger_snapshot, status, service_type, journey_type, chauffeur_note, flight_itinerary, customer_reference, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'converted', 'transfer', 'multi-trip', 'TEST ONLY', '', 'DUMMY-PASSENGER-TEST', UTC_TIMESTAMP(), UTC_TIMESTAMP())", [`Q-PC-${suffix}`, randomUUID(), randomBytes(32).toString('hex'), customerId, customerId, snapshot, snapshot]);
  quoteId = quote.insertId;
  const journeys = [];
  for (const sequence of [1, 2]) {
    const [journey] = await db.execute("INSERT INTO quote_journeys (quote_id, sequence_number, leg_type, pickup_location, dropoff_location, timezone, passengers, timing_source) VALUES (?, ?, ?, 'TEST origin', 'TEST destination', 'Australia/Sydney', 1, 'manual')", [quoteId, sequence, sequence === 1 ? 'outbound' : 'additional']);
    journeys.push(journey.insertId);
  }
  const [booking] = await db.execute("INSERT INTO bookings (reference, quote_id, status, total_amount, created_at) VALUES (?, ?, 'pending', 100, UTC_TIMESTAMP())", [`B-PC-${suffix}`, quoteId]);
  bookingId = booking.insertId;
  await saveBookingPassengers(bookingId, { journeyId: journeys[0], passengers: 2, previousPassengers: 1 });
  const [saved] = await db.execute('SELECT passengers FROM quote_journeys WHERE quote_id = ? ORDER BY sequence_number', [quoteId]);
  assert.deepEqual(saved.map(row => row.passengers), [2, 1]);
  await assert.rejects(saveBookingPassengers(bookingId, { journeyId: journeys[0], passengers: 3, previousPassengers: 1 }), /changed elsewhere/);
  await assert.rejects(saveBookingPassengers(bookingId, { journeyId: 4294967295, passengers: 2, previousPassengers: 1 }), /Journey not found/);
  const [vehicles] = await db.execute('SELECT id, passengers FROM fleet WHERE passengers BETWEEN 1 AND 6 LIMIT 1');
  if (vehicles.length) {
    await db.execute('UPDATE bookings SET assigned_fleet_id = ? WHERE id = ?', [vehicles[0].id, bookingId]);
    await assert.rejects(saveBookingPassengers(bookingId, { journeyId: journeys[0], passengers: vehicles[0].passengers + 1, previousPassengers: 2 }), /space for/);
  }
  await db.execute("UPDATE bookings SET status = 'completed' WHERE id = ?", [bookingId]);
  await assert.rejects(saveBookingPassengers(bookingId, { journeyId: journeys[1], passengers: 2, previousPassengers: 1 }), /closed booking/);
  const [history] = await db.execute('SELECT note FROM quote_status_history WHERE quote_id = ?', [quoteId]);
  assert.equal(history.length, 1);
  assert.match(history[0].note, /passenger count changed from 1 to 2/);
  console.log('Booking passenger checks passed: per-trip save, concurrency, journey ownership, vehicle capacity, closed bookings and audit history.');
} finally {
  if (bookingId) await db.execute('DELETE FROM bookings WHERE id = ? AND reference = ?', [bookingId, `B-PC-${suffix}`]);
  if (quoteId) await db.execute('DELETE FROM quotes WHERE id = ? AND reference = ?', [quoteId, `Q-PC-${suffix}`]);
  if (customerId) await db.execute('DELETE FROM customers WHERE id = ? AND email = ?', [customerId, `passengers-${suffix}@example.invalid`]);
  await db.end();
}
