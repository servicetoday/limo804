import test from 'node:test';
import assert from 'node:assert/strict';
import { createSubmissionKey } from '../lib/submission-key.js';
import { validateContactMessage } from '../lib/contact-message.js';

test('uses native UUID support when available', () => {
  assert.equal(createSubmissionKey({ randomUUID: () => 'native-key' }), 'native-key');
});

test('supports browsers without randomUUID and produces a server-valid submission key', () => {
  const key = createSubmissionKey({ getRandomValues: bytes => { bytes.fill(255); return bytes; } });
  assert.match(key, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.equal(validateContactMessage({ name: 'Test', email: 'test@example.com', message: 'Test message', submissionKey: key }).submissionKey, key);
});

test('reports unavailable browser crypto with a useful error', () => {
  assert.throws(() => createSubmissionKey({}), /current browser/);
});
