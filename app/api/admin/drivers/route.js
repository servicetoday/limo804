import { adminGuard } from '../../../../lib/admin-auth';
import { listDrivers, saveDriver } from '../../../../lib/drivers';
import { readAdminData, adminDataError } from '../../../../lib/admin-data-http';
export async function GET(request) {
  const denied = await adminGuard(request); if (denied) return denied;
  try { return Response.json({ drivers: await listDrivers() }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { return adminDataError(error); }
}
export async function POST(request) {
  const denied = await adminGuard(request); if (denied) return denied;
  try { return Response.json({ driver: await saveDriver(await readAdminData(request)) }, { status: 201 }); }
  catch (error) { return adminDataError(error); }
}
