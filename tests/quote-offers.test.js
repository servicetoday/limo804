import test from 'node:test';
import assert from 'node:assert/strict';
import { offerToken, publicAppUrl, verifyOfferToken } from '../lib/quote-offer-token.js';
import { pricedQuoteEmailContent } from '../lib/quote-email-template.js';

test('private offer signatures bind the offer, nonce and secret', () => {
  const offer = { id: 10, nonce: 'a'.repeat(64) }; const token = offerToken(offer, 'secret-one');
  assert.equal(verifyOfferToken(token, offer, 'secret-one'), true);
  assert.equal(verifyOfferToken(token, { ...offer, id: 11 }, 'secret-one'), false);
  assert.equal(verifyOfferToken(token, { ...offer, nonce: 'b'.repeat(64) }, 'secret-one'), false);
  assert.equal(verifyOfferToken(token, offer, 'secret-two'), false);
  assert.equal(verifyOfferToken(token + '0', offer, 'secret-one'), false);
  assert.equal(verifyOfferToken('bad', offer, 'secret-one'), false);
});
test('customer links use an explicitly configured safe site origin', () => {
  assert.equal(publicAppUrl('https://example.com/'), 'https://example.com');
  assert.equal(publicAppUrl('http://localhost:3000'), 'http://localhost:3000');
  for (const value of ['', 'javascript:alert(1)', 'http://example.com', 'https://user:pass@example.com', 'https://example.com/a', 'https://example.com/?redirect=bad']) assert.throws(() => publicAppUrl(value));
});
test('priced email contains the amount, expiry and a safely escaped review button', () => {
  const quote = { reference: 'q-23112026-AB12', customer_reference: 'DUMMY-TEST', quoted_total: '150.00', currency: 'AUD', journeys: [] };
  const offer = { amount: '150.00', currency: 'AUD', expires_at: '2026-11-30 00:00:00', url: 'https://example.com/quote/view/1.safe' };
  const email = pricedQuoteEmailContent(quote, offer);
  assert.ok(email.subject.includes('AUD 150.00'));
  assert.ok(email.text.includes(offer.url));
  assert.ok(email.html.includes('View quote &amp; confirm booking'));
  assert.ok(email.text.includes('Opening the link does not confirm'));
});
