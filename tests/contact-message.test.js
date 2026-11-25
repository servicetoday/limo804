import test from 'node:test';
import assert from 'node:assert/strict';
import { validateContactMessage, contactEmailContent } from '../lib/contact-message.js';

const valid = { name: ' Alex Lee ', email: ' ALEX@example.com ', phone: '0416 934 865', message: ' Please contact me about an airport transfer. ', website: '', submissionKey: 'd9345316-d4f1-4e08-b5e6-e23a0e871899' };

test('contact messages normalize fields and allow an optional phone', () => {
  const contact = validateContactMessage(valid);
  assert.equal(contact.name, 'Alex Lee');
  assert.equal(contact.email, 'alex@example.com');
  assert.equal(contact.message, 'Please contact me about an airport transfer.');
  assert.equal(validateContactMessage({ ...valid, phone: '' }).phone, '');
});

test('contact validation rejects empty fields, invalid email and oversized messages', () => {
  for (const change of [{ name: '' }, { email: 'invalid-email' }, { message: '' }, { message: 'x'.repeat(5001) }, { phone: 'abc' }, { submissionKey: 'invalid' }, { name: 1 }]) assert.throws(() => validateContactMessage({ ...valid, ...change }));
  for (const input of [null, [], 'message']) assert.throws(() => validateContactMessage(input));
});

test('contact validation prevents email header injection', () => {
  for (const change of [{ name: 'Name\r\nBcc:other@example.com' }, { email: 'alex@example.com\nBcc:other@example.com' }]) assert.throws(() => validateContactMessage({ ...valid, ...change }));
});

test('contact honeypot submissions are ignored', () => {
  assert.deepEqual(validateContactMessage({ website: 'https://spam.example' }), { spam: true });
});

test('contact emails contain reply information and escape visitor HTML', () => {
  const content = contactEmailContent({ ...valid, name: '<Alex>', message: '<script>alert(1)</script>\nSecond line' }, 'C-TEST');
  assert.ok(content.text.includes('C-TEST'));
  assert.ok(content.text.includes(valid.email));
  assert.ok(content.html.includes('&lt;Alex&gt;'));
  assert.ok(content.html.includes('&lt;script&gt;'));
  assert.ok(!content.html.includes('<script>'));
  assert.ok(content.html.includes('<br>Second line'));
});
