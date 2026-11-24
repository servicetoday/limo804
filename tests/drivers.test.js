import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDriver, optionalId, driverEmailType } from '../lib/driver-validation.js';
import { driverBookingEmailContent, driverUnassignedEmailContent } from '../lib/driver-booking-email-template.js';

test('driver validation fixes the temporary recipient and validates vehicle IDs', () => {
  const driver = validateDriver({ name: ' Driver ', phone: '0400 000 000', address: ' Sydney ', assignedFleetId: '3', email: 'other@example.com' });
  assert.equal(driver.email, 'altaf@servicetoday.com.au');
  assert.equal(driver.name, 'Driver'); assert.equal(driver.assignedFleetId, 3);
  assert.equal(optionalId(null), null); assert.equal(optionalId(''), null);
  for (const id of [undefined, true, [], {}, -1, 0, '1.5', 4294967296]) assert.throws(() => optionalId(id));
  for (const change of [{ name: '' }, { phone: 'abc' }, { address: 'x'.repeat(501) }, { assignedFleetId: undefined }]) assert.throws(() => validateDriver({ name: 'Driver', phone: '0400000000', assignedFleetId: null, ...change }));
});
test('notification keys distinguish reassignment to the same driver', () => {
  assert.notEqual(driverEmailType({ id: 1, driver_assignment_version: 1 }), driverEmailType({ id: 1, driver_assignment_version: 3 }));
  assert.ok(driverEmailType({ id: 4294967295, driver_assignment_version: 4294967295 }).length <= 40);
  const removed = { id: 1, driver_assignment_version: 2, assigned_driver_id: null, unassigned_driver_name: 'Driver' };
  assert.match(driverEmailType(removed), /^driver_off_b/);
  assert.notEqual(driverEmailType(removed), driverEmailType({ ...removed, assigned_driver_id: 3 }));
  assert.ok(driverEmailType({ ...removed, id: 4294967295, driver_assignment_version: 4294967295 }).length <= 40);
});
test('unassignment email tells the previous driver not to attend without cancelling the customer booking', () => {
  const content = driverUnassignedEmailContent({ reference: 'B-REMOVE' }, 'Driver <One>', { customer_reference: 'DUMMY-REMOVE' });
  assert.ok(content.subject.includes('Unassigned')); assert.ok(content.subject.startsWith('[TEST]'));
  for (const text of ['Hello Driver <One>', 'unassigned from booking B-REMOVE', 'do not attend', 'does not cancel the customer']) assert.ok(content.text.includes(text));
  assert.ok(content.html.includes('Driver &lt;One&gt;')); assert.ok(!content.html.includes('Driver <One>'));
  assert.ok(!content.text.includes('You have been assigned'));
});
test('driver email includes all journeys, contacts, stops and notes with escaped HTML', () => {
  const quote = {
    customer_reference: 'DUMMY-TEST', passenger_snapshot: { displayName: 'Test Passenger', countryCode: '+61', mobile: '0000000000' },
    pickup_sign_name: 'TEST', chauffeur_note: '<script>test</script>', duration_hours: null,
    journeys: [
      { pickup_location: 'Sydney Airport', dropoff_location: 'CBD', pickup_local_date: '2099-01-02', pickup_local_time: '10:00:00', timezone: 'Australia/Sydney', timing_source: 'manual', passengers: 2, arriving_flight: '', stops: [{ sequence_number: 1, location: 'Mascot' }] },
      { pickup_location: 'Sydney Airport', dropoff_location: 'CBD', timing_source: 'flight', arriving_flight: 'EK412', passengers: 3, stops: [] },
    ],
  };
  const content = driverBookingEmailContent({ reference: 'B-TEST', status: 'pending', currency: 'AUD', total_amount: '150.50' }, { name: 'Driver <One>' }, { name: 'Sedan' }, quote);
  assert.ok(content.text.includes('Booking amount: AUD 150.50'));
  assert.ok(content.html.includes('Booking amount: AUD 150.50'));
  for (const text of ['TEST BOOKING', 'B-TEST', 'Sedan', 'Test Passenger', '+61 0000000000', 'Stop 1: Mascot', '2099-01-02 at 10:00 (Australia/Sydney)', 'Journey 2', 'flight EK412', 'Passengers: 3', 'pending confirmation']) assert.ok(content.text.includes(text));
  assert.ok(content.html.includes('&lt;script&gt;test&lt;/script&gt;')); assert.ok(!content.html.includes('<script>')); assert.ok(content.subject.startsWith('[TEST]'));
  const noVehicle = driverBookingEmailContent({ reference: 'B-ANY', status: 'confirmed', currency: 'AUD', total_amount: '100.00' }, { name: 'Driver' }, null, quote);
  assert.ok(noVehicle.text.includes('Vehicle: Not selected')); assert.ok(noVehicle.html.includes('Vehicle: Not selected'));
});
