import { adminGuard } from '../../../../../../lib/admin-auth';
import { sendDriverBookingEmail } from '../../../../../../lib/driver-booking-email';
import { recordId, adminDataError } from '../../../../../../lib/admin-data-http';
export async function POST(request, context) {
  const denied = await adminGuard(request); if (denied) return denied;
  try { return Response.json(await sendDriverBookingEmail(await recordId(context), { resend: true })); }
  catch (error) { return adminDataError(error); }
}
