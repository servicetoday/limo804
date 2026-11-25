import 'server-only';
import { createHash } from 'node:crypto';
import { adminNotificationEmail } from './notification-settings.js';
import { ContactError, contactEmailContent, validateContactMessage } from './contact-message.js';

const state = globalThis.limoContactMailState ||= { deliveries: new Map(), limits: new Map() };
const windowMs = 15 * 60 * 1000;

export async function sendContactMessage(input) {
  const contact = validateContactMessage(input);
  if (contact.spam) return { success: true };
  if (!process.env.MAILTRAP_API_TOKEN || !process.env.MAILTRAP_FROM_EMAIL) throw new ContactError('Please email admin@limo804.com.au or call 0416 934 865 while our form is unavailable.', 503);
  const now = Date.now();
  for (const collection of [state.deliveries, state.limits]) for (const [key, entry] of collection) if (entry.expires <= now) collection.delete(key);
  const hash = createHash('sha256').update(JSON.stringify(contact)).digest('hex');
  const existing = state.deliveries.get(contact.submissionKey);
  if (existing) {
    if (existing.hash !== hash) throw new ContactError('Please refresh the page before sending a different message.', 409);
    return existing.promise;
  }
  const addressKey = createHash('sha256').update(contact.email).digest('hex');
  const limit = state.limits.get(addressKey) || { count: 0, expires: now + windowMs };
  if (limit.count >= 3) throw new ContactError('Please wait 15 minutes before sending another message, or call our team.', 429);
  if (state.deliveries.size >= 1000 || state.limits.size >= 1000) throw new ContactError('Our contact form is busy. Please email or call our team.', 503);
  limit.count++;
  state.limits.set(addressKey, limit);
  const reference = `C-${contact.submissionKey.slice(0, 8).toUpperCase()}`;
  const promise = (async () => {
    let response;
    try {
      response = await fetch('https://send.api.mailtrap.io/api/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.MAILTRAP_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: { email: process.env.MAILTRAP_FROM_EMAIL, name: process.env.MAILTRAP_FROM_NAME || 'Limo804' }, to: [{ email: adminNotificationEmail }], reply_to: { email: contact.email, name: contact.name }, ...contactEmailContent(contact, reference), category: 'Website contact enquiry' }),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      if (!response.ok || data.success !== true) {
        console.error('Contact email rejected by provider:', response.status);
        throw new ContactError('Your message could not be sent. Please email admin@limo804.com.au or call 0416 934 865.', 502);
      }
    } catch (error) {
      if (error instanceof ContactError) throw error;
      throw new ContactError('We could not confirm delivery. Please email admin@limo804.com.au or call 0416 934 865.', 502);
    }
    return { success: true, reference };
  })();
  // Retries with the same key share the result, including uncertain deliveries.
  state.deliveries.set(contact.submissionKey, { hash, promise, expires: now + windowMs });
  return promise;
}
