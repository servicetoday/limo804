import { redirect } from 'next/navigation';
import { isAdmin } from '../../../lib/admin-auth';
import { listFleet } from '../../../lib/fleet';
import FleetAdmin from './FleetAdmin';
export const metadata = { title: 'Fleet Manager | Limo804', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
export default async function FleetAdminPage() {
  if (!await isAdmin()) redirect('/admin/login');
  let vehicles = []; let error = '';
  try { vehicles = await listFleet(true); } catch { error = 'Cannot connect to MySQL. Check your database settings and run npm run db:setup.'; }
  return <FleetAdmin initialVehicles={vehicles} initialError={error} />;
}
