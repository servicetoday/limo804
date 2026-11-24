import { adminGuard } from '../../../../../lib/admin-auth';
import { saveDriver } from '../../../../../lib/drivers';
import { readAdminData, recordId, adminDataError } from '../../../../../lib/admin-data-http';
export async function PUT(request, context) {
  const denied = await adminGuard(request); if (denied) return denied;
  try { return Response.json({ driver: await saveDriver(await readAdminData(request), await recordId(context)) }); }
  catch (error) { return adminDataError(error); }
}
