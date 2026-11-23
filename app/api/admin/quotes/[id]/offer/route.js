import { adminGuard } from '../../../../../../lib/admin-auth';
import { preparePricedOffer } from '../../../../../../lib/quote-offers';
import { sendQuoteEmail } from '../../../../../../lib/quote-email';
import { quoteErrorResponse, quoteId } from '../../../../../../lib/quote-http';
export async function POST(request, context) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const body = await request.text();
    if (body.length > 2000) return Response.json({ error: 'Request is too large.' }, { status: 413 });
    const data = JSON.parse(body);
    if (!data || typeof data !== 'object' || Array.isArray(data) || (data.sendEmail !== undefined && typeof data.sendEmail !== 'boolean')) return Response.json({ error: 'Invalid offer request.' }, { status: 400 });
    const id = await quoteId(context);
    const offer = await preparePricedOffer(id, data);
    let emailStatus = 'not_sent'; let error = '';
    if (data.sendEmail !== false) {
      try { const result = await sendQuoteEmail(id, offer.recipient, 'priced_quote', offer); emailStatus = result.status; }
      catch (failure) { emailStatus = 'failed'; error = `Price saved, but email could not be sent: ${failure.message}`; }
    }
    return Response.json({ offer: { id: offer.id, amount: offer.amount, currency: offer.currency, recipient: offer.recipient, expiresAt: offer.expires_at, url: offer.url }, emailStatus, error }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return quoteErrorResponse(error); }
}
