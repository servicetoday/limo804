import { adminGuard } from '../../../../../../lib/admin-auth';
import { readAdminData, recordId, adminDataError } from '../../../../../../lib/admin-data-http';
import { saveBookingPassengers } from '../../../../../../lib/booking-passengers';

export async function PUT(request, context) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const data = await readAdminData(request);
    return Response.json(await saveBookingPassengers(await recordId(context), data));
  } catch (error) { return adminDataError(error); }
}
