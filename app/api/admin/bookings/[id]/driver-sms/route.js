import { adminGuard } from '../../../../../../lib/admin-auth';
import { resendDriverBookingSms } from '../../../../../../lib/driver-booking-sms-resend';
import { readAdminData, recordId, adminDataError } from '../../../../../../lib/admin-data-http';

export async function POST(request, context) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const data = await readAdminData(request);
    return Response.json(await resendDriverBookingSms(await recordId(context), data.assignmentVersion));
  } catch (error) { return adminDataError(error); }
}
