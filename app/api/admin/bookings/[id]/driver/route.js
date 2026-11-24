import { adminGuard } from '../../../../../../lib/admin-auth';
import { saveBookingAssignmentAndNotify } from '../../../../../../lib/booking-assignments';
import { readAdminData, recordId, adminDataError } from '../../../../../../lib/admin-data-http';
export async function PUT(request, context) {
  const denied = await adminGuard(request); if (denied) return denied;
  try { const data = await readAdminData(request); return Response.json(await saveBookingAssignmentAndNotify(await recordId(context), data.driverId, data.fleetId)); }
  catch (error) { return adminDataError(error); }
}
