// Run: node --conditions=react-server scripts/test-contact-mail.mjs
// All provider requests are mocked; no email is transmitted.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { sendContactMessage } from '../lib/contact-mail.js';

process.env.MAILTRAP_API_TOKEN = 'mock';
process.env.MAILTRAP_FROM_EMAIL = 'admin@limo804.com.au';
const sent = [];
globalThis.fetch = async (url, options) => {
  assert.equal(url, 'https://send.api.mailtrap.io/api/send');
  sent.push(JSON.parse(options.body));
  return Response.json({ success: true, message_ids: ['mock-contact'] });
};
const input = { name: 'Contact Test', email: 'contact-test@example.invalid', phone: '0000000000', message: 'Test contact form routing.', submissionKey: randomUUID() };
const [first, duplicate] = await Promise.all([sendContactMessage(input), sendContactMessage(input)]);
assert.deepEqual(first, duplicate);
assert.equal(first.success, true);
assert.equal(sent.length, 1);
assert.deepEqual(sent[0].to, [{ email: 'admin@limo804.com.au' }]);
assert.deepEqual(sent[0].reply_to, { email: input.email, name: input.name });
assert.equal(sent[0].from.email, 'admin@limo804.com.au');
assert.ok(sent[0].text.includes(input.message));
await assert.rejects(sendContactMessage({ ...input, message: 'Changed message' }), error => error.status === 409);
await sendContactMessage({ website: 'spam' });
assert.equal(sent.length, 1);
await sendContactMessage({ ...input, submissionKey: randomUUID() });
await sendContactMessage({ ...input, submissionKey: randomUUID() });
await assert.rejects(sendContactMessage({ ...input, submissionKey: randomUUID() }), error => error.status === 429);
globalThis.fetch = async () => Response.json({ success: false }, { status: 403 });
await assert.rejects(sendContactMessage({ ...input, email: 'rejected@example.invalid', submissionKey: randomUUID() }), error => error.status === 502);
globalThis.fetch = async () => { throw new Error('Network timeout'); };
await assert.rejects(sendContactMessage({ ...input, email: 'network@example.invalid', submissionKey: randomUUID() }), /could not confirm delivery/);
console.log('Contact mail checks passed: admin recipient, visitor Reply-To, concurrent retry deduplication, honeypot, rate limit and provider/network errors. No email sent.');
