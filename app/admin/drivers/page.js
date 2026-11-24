import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdmin } from '../../../lib/admin-auth';
import { listDrivers } from '../../../lib/drivers';
import { listFleet } from '../../../lib/fleet';
import Logo from '../../components/Logo';
import DriverManager from './DriverManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Drivers | Limo804 Admin', robots: { index: false, follow: false } };
export default async function DriversPage() {
  if (!await isAdmin()) redirect('/admin/login');
  let drivers = [], vehicles = [], error = '';
  try { [drivers, vehicles] = await Promise.all([listDrivers(), listFleet(true)]); }
  catch { error = 'Could not load drivers and vehicles. Please try again shortly.'; }
  return <div className="admin-shell">
    <header className="admin-header"><Logo /><div><Link href="/admin/bookings">Bookings</Link><Link href="/admin/quotes">Quote requests</Link><Link href="/admin/fleet">Fleet manager</Link></div></header>
    <main className="admin-main"><div className="admin-title"><div><p className="eyebrow">Limo804 administration</p><h1>Drivers</h1><p>Add a driver, optionally attach a vehicle, then assign them to a booking.</p></div></div>
      {error ? <p className="admin-error" role="alert">{error}</p> : <DriverManager initialDrivers={drivers} vehicles={vehicles} />}
    </main>
  </div>;
}
