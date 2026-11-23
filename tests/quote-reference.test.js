import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuoteReference, insertWithQuoteReference } from '../lib/quote-reference.js';

test('quote references use Sydney date and a four-character alphanumeric suffix', () => {
  for (let i = 0; i < 100; i++) assert.match(createQuoteReference(new Date('2026-11-23T14:30:00Z')), /^q-24112026-[A-Z0-9]{4}$/);
  assert.match(createQuoteReference(new Date('2026-11-23T00:00:00Z')), /^q-23112026-[A-Z0-9]{4}$/);
  assert.match(createQuoteReference(new Date('2026-01-05T00:00:00Z')), /^q-05012026-[A-Z0-9]{4}$/);
});
test('a duplicate reference retries the insert with a new reference', async () => {
  const references = ['q-23112026-A1B2', 'q-23112026-C3D4']; const tried = [];
  const result = await insertWithQuoteReference(async reference => {
    tried.push(reference);
    if (tried.length === 1) throw Object.assign(new Error(), { code: 'ER_DUP_ENTRY', sqlMessage: "Duplicate entry for key 'quotes.reference'" });
    return 10;
  }, () => references.shift());
  assert.equal(result.reference, 'q-23112026-C3D4'); assert.equal(result.id, 10); assert.equal(tried.length, 2);
});
test('submission-key conflicts and database failures retain normal error handling', async () => {
  const conflict = Object.assign(new Error('Duplicate key'), { code: 'ER_DUP_ENTRY', sqlMessage: "Duplicate entry for key 'quotes.submission_key'" });
  let attempts = 0;
  await assert.rejects(insertWithQuoteReference(async () => { attempts++; throw conflict; }), error => error === conflict);
  assert.equal(attempts, 1);
});
test('reference collision retries are bounded', async () => {
  let attempts = 0;
  await assert.rejects(insertWithQuoteReference(async () => { attempts++; throw Object.assign(new Error(), { code: 'ER_DUP_ENTRY', sqlMessage: "Duplicate entry for key 'reference'" }); }));
  assert.equal(attempts, 20);
});
