import { adminGuard } from '../../../../lib/admin-auth';
import { listQuotes } from '../../../../lib/quotes';
import { quoteErrorResponse } from '../../../../lib/quote-http';
export async function GET(request) {
  const denied = await adminGuard(request); if (denied) return denied;
  try { return Response.json({ quotes: await listQuotes() }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return quoteErrorResponse(error); }
}
