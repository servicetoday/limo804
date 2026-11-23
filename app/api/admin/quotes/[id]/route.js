import { adminGuard } from '../../../../../lib/admin-auth';
import { getQuote, updateQuote } from '../../../../../lib/quotes';
import { quoteErrorResponse, quoteId } from '../../../../../lib/quote-http';
export async function GET(request, context) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const quote = await getQuote(await quoteId(context));
    return quote ? Response.json({ quote }, { headers: { 'Cache-Control': 'no-store' } }) : Response.json({ error: 'Quote not found.' }, { status: 404 });
  } catch (error) { return quoteErrorResponse(error); }
}
export async function PATCH(request, context) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const body = await request.text();
    if (body.length > 5000) return Response.json({ error: 'Update is too large.' }, { status: 413 });
    return Response.json({ quote: await updateQuote(await quoteId(context), JSON.parse(body)) });
  } catch (error) { return quoteErrorResponse(error); }
}
