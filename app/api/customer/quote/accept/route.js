import { validOrigin } from '../../../../../lib/admin-auth';
import { acceptCustomerOffer } from '../../../../../lib/quote-offers';
import { quoteErrorResponse } from '../../../../../lib/quote-http';
import { sendQuoteEmail } from '../../../../../lib/quote-email';
export async function POST(request) {
  if (!validOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    const body = await request.text();
    if (body.length > 1000) return Response.json({ error: 'Request is too large.' }, { status: 413 });
    const data = JSON.parse(body);
    if (!data || data.accepted !== true) return Response.json({ error: 'Please accept the quote before confirming your booking.' }, { status: 400 });
    const result = await acceptCustomerOffer(data.token);
    let emailStatus = 'not_sent';
    if (!result.repeated && !/\.(invalid|test|example)$/i.test(result.recipient)) {
      try { emailStatus = (await sendQuoteEmail(result.quoteId, result.recipient, 'booking_update')).status; } catch { emailStatus = 'failed'; }
    }
    return Response.json({ booking: result.booking, repeated: result.repeated, emailStatus }, { status: result.repeated ? 200 : 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return quoteErrorResponse(error); }
}
