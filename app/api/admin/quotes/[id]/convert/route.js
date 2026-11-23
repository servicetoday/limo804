import { adminGuard } from '../../../../../../lib/admin-auth';
import { convertQuote } from '../../../../../../lib/quotes';
import { quoteErrorResponse, quoteId } from '../../../../../../lib/quote-http';
export async function POST(request, context) {
  const denied = await adminGuard(request); if (denied) return denied;
  try { return Response.json({ booking: await convertQuote(await quoteId(context)) }); }
  catch (error) { return quoteErrorResponse(error); }
}
