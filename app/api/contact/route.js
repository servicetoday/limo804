import { validOrigin } from '../../../lib/admin-auth';
import { sendContactMessage } from '../../../lib/contact-mail';
import { ContactError } from '../../../lib/contact-message';

export const runtime = 'nodejs';

export async function POST(request) {
  if (!validOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ContactError('Please submit the contact form as JSON.', 415);
    if (Number(request.headers.get('content-length')) > 20000) throw new ContactError('Your message is too large.', 413);
    const body = await request.text();
    if (Buffer.byteLength(body, 'utf8') > 20000) throw new ContactError('Your message is too large.', 413);
    const result = await sendContactMessage(JSON.parse(body));
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof ContactError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return Response.json({ error: 'Please check your contact details and try again.' }, { status: 400 });
    console.error('Contact form failed:', error.name);
    return Response.json({ error: 'We could not send your message. Please email or call our team.' }, { status: 503 });
  }
}
