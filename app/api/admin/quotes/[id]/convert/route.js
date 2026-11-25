import { adminGuard } from '../../../../../../lib/admin-auth';
import { convertQuote } from '../../../../../../lib/quotes';
import { quoteErrorResponse, quoteId } from '../../../../../../lib/quote-http';
import { sendAdminNotification } from '../../../../../../lib/quote-email';
export async function POST(request, context) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const id = await quoteId(context);
    const booking = await convertQuote(id);
    let adminEmailStatus = 'not_sent';
    try { adminEmailStatus = (await sendAdminNotification(id, 'admin_booking'))?.status || 'not_sent'; } catch { adminEmailStatus = 'failed'; }
    return Response.json({ booking, adminEmailStatus });
  }
  catch (error) { return quoteErrorResponse(error); }
}
