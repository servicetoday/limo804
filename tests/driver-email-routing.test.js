import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export {}', shortCircuit: true };
  if (context.parentURL?.endsWith('/lib/driver-booking-email.js') && specifier === './quotes') return { url: 'data:text/javascript,export async function getQuote() { return globalThis.emailRoutingQuote; }', shortCircuit: true };
  try { return nextResolve(specifier, context); }
  catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && /^\.\.?\//.test(specifier) && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.js`, context);
    throw error;
  }
} });

let booking, driver, emails, requests, committed;
const connection = {
  async beginTransaction() { committed = false; }, async commit() { committed = true; }, async rollback() {}, release() {},
  async execute(sql, params) {
    if (sql.startsWith('SELECT * FROM bookings')) return [[booking]];
    if (sql.startsWith('SELECT * FROM drivers')) return [[driver]];
    if (sql.startsWith('INSERT INTO quote_emails')) {
      const recipient = params[2];
      if (!emails.has(recipient)) emails.set(recipient, { id: emails.size + 1, status: 'pending' });
      return [{}];
    }
    if (sql.startsWith('SELECT * FROM quote_emails')) return [[emails.get(params[2])]];
    if (sql.startsWith('UPDATE quote_emails')) return [{}];
    throw new Error(`Unexpected query: ${sql}`);
  },
};
globalThis.limoDb = { async getConnection() { return connection; }, async execute() { return [{}]; } };
const { sendDriverBookingEmail } = await import('../lib/driver-booking-email.js');
const realFetch = globalThis.fetch;
const envKeys = ['MAILTRAP_API_TOKEN', 'MAILTRAP_FROM_EMAIL'];
const oldEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
test.beforeEach(() => {
  process.env.MAILTRAP_API_TOKEN = 'mock-token'; process.env.MAILTRAP_FROM_EMAIL = 'sender@example.invalid';
  booking = { id: 12, quote_id: 8, reference: 'B-20261126-1234', status: 'pending', assigned_driver_id: 1, assigned_fleet_id: null, driver_assignment_version: 2, total_amount: '100', currency: 'AUD' };
  driver = { id: 1, name: 'Test Driver', email: 'altaf@servicetoday.com.au' };
  emails = new Map(); requests = []; committed = false;
  globalThis.emailRoutingQuote = { passenger_snapshot: { displayName: 'Test Passenger' }, journeys: [] };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://send.api.mailtrap.io/api/send'); assert.equal(committed, true);
    requests.push(JSON.parse(options.body));
    return Response.json({ success: true, message_ids: ['mock-mail-id'] });
  };
});
test.after(() => {
  globalThis.fetch = realFetch;
  for (const key of envKeys) { if (oldEnv[key] === undefined) delete process.env[key]; else process.env[key] = oldEnv[key]; }
  delete globalThis.limoDb; delete globalThis.emailRoutingQuote;
});

test('assignment email goes to driver profile even if the old admin log was accepted', async () => {
  emails.set('admin@limo804.com.au', { id: 1, status: 'accepted' });
  const result = await sendDriverBookingEmail(12, { assignmentVersion: 2 });
  assert.equal(result.recipient, 'altaf@servicetoday.com.au'); assert.equal(result.repeated, false);
  assert.deepEqual(requests[0].to, [{ email: 'altaf@servicetoday.com.au' }]);
  assert.equal(emails.has('altaf@servicetoday.com.au'), true);
  emails.get('altaf@servicetoday.com.au').status = 'accepted';
  assert.equal((await sendDriverBookingEmail(12)).repeated, true); assert.equal(requests.length, 1);
  await sendDriverBookingEmail(12, { resend: true }); assert.equal(requests.length, 2);
});

test('unassignment notice uses the removed driver email snapshot', async () => {
  booking.assigned_driver_id = null; booking.unassigned_driver_name = 'Previous Driver';
  booking.unassigned_driver_email = 'previous@example.com';
  const result = await sendDriverBookingEmail(12);
  assert.equal(result.notificationType, 'unassigned');
  assert.deepEqual(requests[0].to, [{ email: 'previous@example.com' }]);
});

test('missing driver email reports an error instead of sending to admin', async () => {
  driver.email = '';
  await assert.rejects(sendDriverBookingEmail(12), /valid email address/);
  booking.assigned_driver_id = null; booking.unassigned_driver_name = 'Previous Driver';
  await assert.rejects(sendDriverBookingEmail(12), /valid email address/);
  assert.equal(requests.length, 0); assert.equal(emails.size, 0);
});
