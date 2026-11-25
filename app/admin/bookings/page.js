import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdmin } from '../../../lib/admin-auth';
import { listBookings } from '../../../lib/bookings';
import Logo from '../../components/Logo';
import { listDrivers } from '../../../lib/drivers';
import { listFleet } from '../../../lib/fleet';
import BookingDriverActions from './BookingDriverActions';
import BookingPassengerCounts from './BookingPassengerCounts';
import styles from './bookings.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bookings | Limo804 Admin', robots: { index: false, follow: false } };

function PickupTime({ booking }) {
  if (booking.timing_source === 'flight') {
    return <>Flight {booking.arriving_flight || 'arrival'}<small>Pick-up time needs confirmation</small></>;
  }
  if (!booking.pickup_local_date || !booking.pickup_local_time) return 'Time not set';
  return <>{booking.pickup_local_date} at {booking.pickup_local_time.slice(0, 5)}<small>{booking.timezone}</small></>;
}

export default async function BookingsPage() {
  if (!await isAdmin()) redirect('/admin/login');
  let bookings = [];
  let drivers = [];
  let vehicles = [];
  let error = '';
  try { [bookings, drivers, vehicles] = await Promise.all([listBookings(), listDrivers(), listFleet(true)]); }
  catch { error = 'Could not load bookings. Please try again shortly.'; }

  return <div className={`admin-shell ${styles.page}`}>
    <header className={`admin-header ${styles.header}`}><Logo /><nav aria-label="Admin navigation"><Link href="/admin/drivers">Drivers</Link><Link href="/admin/quotes">Quote requests</Link><Link href="/admin/fleet">Fleet manager</Link></nav></header>
    <main className="admin-main">
      <div className="admin-title"><div><p className="eyebrow">Limo804 administration</p><h1>Bookings</h1><p>Review bookings and open the related quote for full journey and customer details.</p></div>{!error && <span>Latest {bookings.length} booking{bookings.length === 1 ? '' : 's'}</span>}</div>
      {error ? <p className="admin-error" role="alert">{error}</p> : <section className={`admin-inventory ${styles.inventory}`} aria-label="Bookings">
        {bookings.length === 0 ? <div className="admin-empty"><h2>No bookings yet.</h2><p>Bookings will appear here when an accepted quote is converted or a customer accepts a priced offer.</p><Link className="gold-button" href="/admin/quotes">View quote requests</Link></div> : <div className="quote-table-scroll">
          <table className={`quote-admin-table bookings-table ${styles.table}`} role="table">
            <caption className="sr-only">Latest bookings with passenger, first journey, vehicle, status and total</caption>
            <thead role="rowgroup"><tr role="row"><th scope="col">Booking</th><th scope="col">Passenger</th><th scope="col">Passengers</th><th scope="col">Journey</th><th scope="col">Pick-up time</th><th scope="col">Vehicle</th><th scope="col">Driver &amp; notification</th><th scope="col">Status</th><th scope="col">Total</th></tr></thead>
            <tbody role="rowgroup">{bookings.map(booking => <tr key={booking.id} role="row">
              <td role="cell" data-label="Booking" className={styles.reference}><Link href={`/admin/quotes/${booking.quote_id}`}>{booking.reference}</Link><small>Quote {booking.quote_reference}</small></td>
              <td role="cell" data-label="Passenger">{booking.passenger_name}</td>
              <td role="cell" data-label="Passengers"><BookingPassengerCounts booking={booking} /></td>
              <td role="cell" data-label="Journey" className="booking-route">{booking.pickup_location || 'Journey not set'}{booking.dropoff_location && <> → {booking.dropoff_location}</>}<small>{booking.service_type === 'hourly' ? 'Hourly' : booking.journey_type}{booking.journey_count > 1 && ` · ${booking.journey_count} trips (first shown)`}</small></td>
              <td role="cell" data-label="Pick-up time" className={styles.half}><PickupTime booking={booking} /></td>
              <td role="cell" data-label="Vehicle" className={styles.half}>{booking.vehicle_name || 'Any vehicle'}</td>
              <td role="cell" data-label="Driver & notification"><BookingDriverActions booking={booking} drivers={drivers} vehicles={vehicles} /></td>
              <td role="cell" data-label="Status" className={styles.half}><span className={`quote-status status-${booking.status}`}>{booking.status}</span></td>
              <td role="cell" data-label="Total" className={`booking-total ${styles.half}`}>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: booking.currency, currencyDisplay: 'code' }).format(Number(booking.total_amount))}</td>
            </tr>)}</tbody>
          </table>
        </div>}
      </section>}
    </main>
  </div>;
}
