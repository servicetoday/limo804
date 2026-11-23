import { adminGuard } from '../../../../../../lib/admin-auth';
import { sendQuoteEmail } from '../../../../../../lib/quote-email';
import { quoteErrorResponse, quoteId } from '../../../../../../lib/quote-http';
export async function POST(request, context) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const body = await request.text();
    if (body.length > 1000) return Response.json({ error: 'Request is too large.' }, { status: 413 });
    const data = body ? JSON.parse(body) : {};
    if (data.recipient !== undefined && typeof data.recipient !== 'string') return Response.json({ error: 'Invalid recipient.' }, { status: 400 });
    return Response.json(await sendQuoteEmail(await quoteId(context), data.recipient || '', data.emailType || 'acknowledgement'));
  } catch (error) { return quoteErrorResponse(error); }
}
