import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, registerHooks } from 'node:module';
// The SDK loads Axios through CommonJS; patch that same module instance.
const axios = createRequire(import.meta.url)('axios');

// Exercise the real SDK with an in-memory transport; never contact SMS providers.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export {}', shortCircuit: true };
  if (context.parentURL?.endsWith('/lib/booking-assignments.js')) {
    if (specifier === './quotes') return { url: 'data:text/javascript,export async function getQuote() { return globalThis.smsTestQuote; }', shortCircuit: true };
    if (specifier === './driver-booking-email') return { url: 'data:text/javascript,export async function sendDriverBookingEmail() { return globalThis.smsTestEmail(); }', shortCircuit: true };
  }
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && /^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.js`, context);
    throw error;
  }
} });

let booking, drivers, committed, requests, history, manualSend;
const connection = {
  async beginTransaction() { committed = false; },
  async commit() { committed = true; },
  async rollback() {}, release() {},
  async execute(sql, params) {
    if (sql.startsWith('SELECT * FROM bookings')) return [booking ? [{ ...booking }] : []];
    if (sql.startsWith('SELECT customer_reference FROM quotes')) return [[globalThis.smsTestQuote]];
    if (sql.includes('FROM quote_emails')) return [[]];
    if (sql.includes('FROM drivers')) return [[drivers.get(params[0])].filter(Boolean)];
    if (sql.includes('FROM fleet')) return [[{ id: params[0], passengers: 4 }]];
    if (sql.includes('MAX(passengers)')) return [[{ required: 1 }]];
    if (sql.startsWith('UPDATE bookings')) {
      [booking.assigned_driver_id, booking.assigned_fleet_id, booking.unassigned_driver_name, booking.unassigned_driver_email] = params;
      booking.driver_assignment_version++;
      return [{}];
    }
    if (sql.startsWith('INSERT INTO quote_status_history')) { history++; return [{}]; }
    throw new Error(`Unexpected SQL: ${sql}`);
  },
};
globalThis.limoDb = { async getConnection() { return connection; } };
const { saveBookingAssignmentAndNotify } = await import('../lib/booking-assignments.js');
const { driverSmsPhone, sendDriverBookingSms } = await import('../lib/driver-booking-sms.js');
const { resendDriverBookingSms } = await import('../lib/driver-booking-sms-resend.js');
const oldAdapter = axios.defaults.adapter;
const envNames = ['CLICKSEND_USERNAME', 'CLICKSEND_API_KEY', 'CLICKSEND_FROM', 'CLICKSEND_TEST_TO', 'PUBLIC_APP_URL', 'DRIVER_BOOKING_LINK_SECRET'];
const oldEnv = Object.fromEntries(envNames.map(name => [name, process.env[name]]));

test.beforeEach(() => {
  booking = { id: 12, quote_id: 8, reference: 'B-TEST-12', status: 'pending', assigned_driver_id: null, assigned_fleet_id: null, driver_assignment_version: 0, unassigned_driver_name: null };
  drivers = new Map([[1, { name: 'First Driver', phone: '0412 345 678' }], [2, { name: 'Second Driver', phone: '+61487654321' }]]);
  committed = false; requests = []; history = 0; manualSend = false;
  process.env.CLICKSEND_USERNAME = 'mock-user'; process.env.CLICKSEND_API_KEY = 'mock-key'; process.env.CLICKSEND_FROM = 'Limo804';
  delete process.env.CLICKSEND_TEST_TO;
  process.env.PUBLIC_APP_URL = 'https://example.com'; process.env.DRIVER_BOOKING_LINK_SECRET = 'test-driver-link-secret';
  globalThis.smsTestQuote = { journeys: [{ pickup_location: 'Sydney Airport', dropoff_location: 'CBD', pickup_local_date: '2030-01-02', pickup_local_time: '10:00:00', timezone: 'Australia/Sydney' }] };
  globalThis.smsTestEmail = async () => ({ status: 'accepted' });
  axios.defaults.adapter = async config => {
    assert.ok(committed || manualSend, 'Automatic SMS must only be sent after assignment commit');
    if (manualSend) assert.equal(committed, false, 'Manual resend keeps the current assignment locked until the send finishes');
    requests.push(config);
    return { status: 200, data: { response_code: 'SUCCESS', data: { messages: [{ status: 'SUCCESS', message_id: `mock-${requests.length}` }] } }, headers: {}, config };
  };
});
test.after(() => {
  axios.defaults.adapter = oldAdapter;
  for (const name of envNames) {
    if (oldEnv[name] === undefined) delete process.env[name]; else process.env[name] = oldEnv[name];
  }
  delete globalThis.limoDb; delete globalThis.smsTestQuote; delete globalThis.smsTestEmail;
});

test('assignment uses the SDK, exact SMS endpoint, Basic credentials and driver phone', async () => {
  const result = await saveBookingAssignmentAndNotify(12, 1);
  assert.equal(result.sms[0].status, 'accepted');
  assert.equal(result.smsContext, undefined);
  assert.equal(requests.length, 1);
  const request = requests[0], message = JSON.parse(request.data).messages[0];
  assert.equal(`${request.baseURL || ''}${request.url}`, 'https://rest.clicksend.com/v3/sms/send');
  assert.equal(request.method, 'post');
  assert.deepEqual(request.auth, { username: 'mock-user', password: 'mock-key' });
  assert.equal(request.timeout, 20000);
  assert.equal(message.to, '+61412345678'); assert.equal(message.from, 'Limo804');
  assert.match(message.body, /assigned booking B-TEST-12/);
  assert.match(message.body, /View booking details: https:\/\/limo804.com.au\/driver\/booking\/12\.1\./);
  assert.match(message.body, /Pending confirmation/);
  assert.equal(message.custom_string, 'booking-12-v1-assigned');
  await saveBookingAssignmentAndNotify(12, 1);
  assert.equal(requests.length, 1, 'unchanged saves must not send duplicate SMS');
});

test('unassignment retains the previous recipient after clearing the driver', async () => {
  booking.assigned_driver_id = 1;
  const result = await saveBookingAssignmentAndNotify(12, null);
  assert.equal(booking.assigned_driver_id, null);
  assert.equal(result.sms[0].notificationType, 'unassigned');
  const message = JSON.parse(requests[0].data).messages[0];
  assert.equal(message.to, '+61412345678'); assert.match(message.body, /unassigned.*B-TEST-12/);
  assert.match(message.body, /Do not attend/);
  await saveBookingAssignmentAndNotify(12, null);
  assert.equal(requests.length, 1);
});

test('already-unassigned saves send no SMS; vehicle changes refresh the private link', async () => {
  const empty = await saveBookingAssignmentAndNotify(12, null);
  assert.deepEqual(empty.sms, []);
  booking.assigned_driver_id = 1; drivers.get(1).assigned_fleet_id = 7;
  const changed = await saveBookingAssignmentAndNotify(12, 1, 7);
  assert.equal(changed.assignedFleetId, 7); assert.equal(changed.sms[0].status, 'accepted');
  assert.match(JSON.parse(requests[0].data).messages[0].body, /driver\/booking\/12\.1\./);
});

test('replacement notifies the old and new drivers even when email fails', async () => {
  booking.assigned_driver_id = 1;
  globalThis.smsTestEmail = async () => { throw new Error('email unavailable'); };
  const result = await saveBookingAssignmentAndNotify(12, 2);
  assert.equal(booking.assigned_driver_id, 2);
  assert.equal(result.sms.length, 2); assert.ok(result.emailError);
  assert.deepEqual(result.sms.map(sms => [sms.recipient, sms.notificationType]), [['+61412345678', 'unassigned'], ['+61487654321', 'assigned']]);
});

test('missing configuration and invalid phones leave assignment saved and surface SMS errors', async () => {
  delete process.env.CLICKSEND_API_KEY;
  const result = await saveBookingAssignmentAndNotify(12, 1);
  assert.equal(booking.assigned_driver_id, 1); assert.match(result.smsError, /ClickSend is not configured/);
  assert.equal(result.email.status, 'accepted'); assert.equal(requests.length, 0);
  drivers.get(2).phone = '0000000000';
  const replacement = await saveBookingAssignmentAndNotify(12, 2);
  assert.equal(booking.assigned_driver_id, 2); assert.match(replacement.smsError, /valid international number/);
});

test('HTTP 200 message rejection is surfaced and does not prevent notifying replacement', async () => {
  booking.assigned_driver_id = 1;
  const successAdapter = axios.defaults.adapter;
  axios.defaults.adapter = async config => {
    const response = await successAdapter(config);
    if (requests.length === 1) response.data.data.messages[0].status = 'INSUFFICIENT_CREDIT';
    return response;
  };
  const result = await saveBookingAssignmentAndNotify(12, 2);
  assert.match(result.smsError, /did not confirm/);
  assert.equal(result.sms[1].status, 'accepted'); assert.equal(booking.assigned_driver_id, 2);
});

test('network errors and HTTP failures are safe to display without credentials', async () => {
  for (const status of [undefined, 401, 503]) {
    axios.defaults.adapter = async () => { throw Object.assign(new Error('mock-key credential-bearing error'), status ? { response: { status } } : {}); };
    const result = await saveBookingAssignmentAndNotify(12, booking.assigned_driver_id === 1 ? 2 : 1);
    assert.match(result.smsError, status === 401 ? /rejected/ : /uncertain/);
    assert.ok(!result.smsError.includes('mock-key')); assert.equal(result.email.status, 'accepted');
  }
});

test('invalid or closed assignment never sends SMS', async () => {
  await assert.rejects(saveBookingAssignmentAndNotify(12, 999), /Driver not found/);
  booking.status = 'completed';
  await assert.rejects(saveBookingAssignmentAndNotify(12, 1), /no longer/);
  assert.equal(requests.length, 0); assert.equal(history, 0);
});

test('phone formatting accepts Australian and international numbers and rejects placeholders', () => {
  assert.equal(driverSmsPhone('(04) 1234-5678'), '+61412345678');
  assert.equal(driverSmsPhone('412345678'), '+61412345678');
  assert.equal(driverSmsPhone('00447911123456'), '+447911123456');
  assert.equal(driverSmsPhone('+1 (202) 555-0123'), '+12025550123');
  for (const phone of ['', '0000000000', 'abc+61412345678', '+61+412345678']) assert.throws(() => driverSmsPhone(phone), /valid international/);
});

test('SMS links to the details page and supports the default sender', async () => {
  delete process.env.CLICKSEND_FROM;
  committed = true;
  booking.assigned_driver_id = 1;
  const quote = { customer_reference: 'DUMMY-SMS', journeys: [{ pickup_location: 'Airport', timing_source: 'flight', arriving_flight: 'QF1' }] };
  await sendDriverBookingSms(booking, drivers.get(1), 'assigned', quote);
  const message = JSON.parse(requests[0].data).messages[0];
  assert.match(message.body, /TEST ONLY/); assert.match(message.body, /View booking details: https:\/\/limo804.com.au\/driver\/booking\//);
  assert.equal(message.from, undefined);
});

test('test recipient override sends to the configured test number', async () => {
  process.env.CLICKSEND_TEST_TO = '0411573341';
  const result = await saveBookingAssignmentAndNotify(12, 1);
  assert.equal(result.sms[0].recipient, '+61411573341');
  assert.equal(JSON.parse(requests[0].data).messages[0].to, '+61411573341');
});

test('manual SMS resend sends only SMS with the current link and leaves assignment unchanged', async () => {
  booking.assigned_driver_id = 1; booking.driver_assignment_version = 5; manualSend = true;
  const original = { ...booking };
  globalThis.smsTestEmail = async () => { throw new Error('Manual SMS must not send email'); };
  const result = await resendDriverBookingSms(12, 5);
  assert.equal(result.status, 'accepted'); assert.equal(result.recipient, '+61412345678');
  assert.equal(requests.length, 1); assert.equal(committed, true); assert.equal(history, 0);
  assert.deepEqual(booking, original);
  assert.match(JSON.parse(requests[0].data).messages[0].body, /driver\/booking\/12\.5\./);
  await resendDriverBookingSms(12, 5);
  assert.equal(requests.length, 2, 'An explicit manual resend should send another copy');
});

test('manual SMS rejects stale, closed, unassigned and missing driver bookings before sending', async () => {
  manualSend = true;
  for (const version of [undefined, -1, '0']) await assert.rejects(resendDriverBookingSms(12, version), /Invalid assignment version/);
  await assert.rejects(resendDriverBookingSms(12, 1), /assignment changed/);
  await assert.rejects(resendDriverBookingSms(12, 0), /Assign a driver/);
  booking.assigned_driver_id = 1;
  for (const status of ['cancelled', 'completed']) {
    booking.status = status;
    await assert.rejects(resendDriverBookingSms(12, 0), /no longer/);
  }
  booking.status = 'pending'; drivers.delete(1);
  await assert.rejects(resendDriverBookingSms(12, 0), /driver is unavailable/);
  booking = null;
  await assert.rejects(resendDriverBookingSms(12, 0), /Booking not found/);
  assert.equal(requests.length, 0);
});

test('manual SMS reports uncertain provider delivery and releases the assignment unchanged', async () => {
  booking.assigned_driver_id = 1; manualSend = true;
  const original = { ...booking };
  axios.defaults.adapter = async () => { throw new Error('Network failure'); };
  await assert.rejects(resendDriverBookingSms(12, 0), /delivery is uncertain/);
  assert.deepEqual(booking, original); assert.equal(history, 0); assert.equal(committed, false);
});
