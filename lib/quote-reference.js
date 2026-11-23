import { randomInt } from 'node:crypto';

export function createQuoteReference(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map(part => [part.type, part.value]));
  const suffix = randomInt(36 ** 4).toString(36).padStart(4, '0').toUpperCase();
  return `q-${parts.day}${parts.month}${parts.year}-${suffix}`;
}

export async function insertWithQuoteReference(insert, generate = createQuoteReference) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const reference = generate();
    try { return { id: await insert(reference), reference }; }
    catch (error) {
      const referenceCollision = error.code === 'ER_DUP_ENTRY' && /for key ['`"](?:\w+\.)?reference['`"]/i.test(error.sqlMessage || error.message || '');
      if (!referenceCollision || attempt === 19) throw error;
    }
  }
}
