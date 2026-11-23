import { createHmac, timingSafeEqual } from 'node:crypto';

export function offerToken(offer, secret) {
  if (!secret) throw new Error('Customer quote link signing is not configured.');
  const signature = createHmac('sha256', secret).update(`customer-quote:${offer.id}:${offer.nonce}`).digest('hex');
  return `${offer.id}.${signature}`;
}
export function verifyOfferToken(token, offer, secret) {
  if (typeof token !== 'string' || !/^\d{1,10}\.[a-f0-9]{64}$/.test(token) || !secret || !offer) return false;
  const expected = Buffer.from(offerToken(offer, secret)); const supplied = Buffer.from(token);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
export function publicAppUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Set PUBLIC_APP_URL to your customer-facing website URL.'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) || url.pathname !== '/' || url.search || url.hash) throw new Error('PUBLIC_APP_URL must be a website origin using HTTPS (or HTTP localhost for testing).');
  return url.origin;
}
