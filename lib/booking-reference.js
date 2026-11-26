import { randomInt } from 'node:crypto';
import { insertWithQuoteReference } from './quote-reference.js';

export function createBookingReference(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map(part => [part.type, part.value]));
  return `B-${parts.year}${parts.month}${parts.day}-${String(randomInt(10000)).padStart(4, '0')}`;
}

export function insertWithBookingReference(insert, generate = createBookingReference) {
  return insertWithQuoteReference(insert, generate);
}
