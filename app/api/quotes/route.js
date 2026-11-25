import { validOrigin } from '../../../lib/admin-auth';
import { prepareQuoteFile, submitQuote } from '../../../lib/quotes';
import { QuoteError } from '../../../lib/quote-validation';
import { quoteErrorResponse } from '../../../lib/quote-http';
import { sendNewQuoteEmail, sendAdminNewQuoteEmail } from '../../../lib/quote-email';

export const runtime = 'nodejs';
export async function POST(request) {
  if (!validOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    if (Number(request.headers.get('content-length')) > 11 * 1024 * 1024) throw new QuoteError('Request is too large. Attach a file under 10 MB.', 413);
    const type = request.headers.get('content-type') || '';
    let payload; let file = null;
    if (type.startsWith('multipart/form-data')) {
      const form = await request.formData();
      const json = form.get('payload');
      if (typeof json !== 'string' || json.length > 100000) throw new QuoteError('Invalid quote details.');
      payload = JSON.parse(json);
      file = await prepareQuoteFile(form.get('attachment'));
    } else if (type.startsWith('application/json')) {
      const body = await request.text();
      if (body.length > 100000) throw new QuoteError('Quote details are too large.', 413);
      payload = JSON.parse(body);
    } else throw new QuoteError('Send quote details as JSON or form data.', 415);
    const saved = await submitQuote(payload, file);
    let emailStatus = 'not_sent';
    let adminEmailStatus = 'not_sent';
    if (!saved.repeated) {
      const [customer, admin] = await Promise.allSettled([sendNewQuoteEmail(saved.reference), sendAdminNewQuoteEmail(saved.reference)]);
      emailStatus = customer.status === 'fulfilled' ? customer.value?.status || 'not_sent' : 'failed';
      adminEmailStatus = admin.status === 'fulfilled' ? admin.value?.status || 'not_sent' : 'failed';
    }
    return Response.json({ ...saved, emailStatus, adminEmailStatus }, { status: saved.repeated ? 200 : 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return quoteErrorResponse(error); }
}
