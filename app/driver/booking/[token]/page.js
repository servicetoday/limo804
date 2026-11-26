import { notFound } from 'next/navigation';
import { getDriverBookingDetails } from '../../../../lib/driver-booking-details';
import Logo from '../../../components/Logo';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Driver Booking | Limo804', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function DriverBookingPage({ params }) {
  const { token } = await params;
  let booking;
  try { booking = await getDriverBookingDetails(token); }
  catch (error) { if (error.status === 404) notFound(); throw error; }
  return <div className={styles.shell}>
    <header className={styles.header}><Logo /><span>Driver booking</span></header>
    <main className={styles.main}>
      <p className={styles.eyebrow}>Your assignment</p>
      <h1>Booking {booking.reference}</h1>
      <p className={styles.status}>{booking.status}</p>
      {booking.isTest && <p className={styles.warning}>TEST BOOKING — dummy data only. Do not dispatch.</p>}
      {booking.status === 'pending' && <p className={styles.warning}>Pending confirmation. Contact dispatch before proceeding.</p>}
      <section className={styles.card} aria-labelledby="assignment-heading">
        <h2 id="assignment-heading">Assignment details</h2>
        <dl className={styles.details}>
          <div><dt>Driver</dt><dd>{booking.driverName}</dd></div>
          <div><dt>Vehicle</dt><dd>{booking.vehicleName}{booking.registration && <small>Registration: {booking.registration}</small>}</dd></div>
          <div><dt>Passenger</dt><dd>{booking.passengerName}{booking.passengerPhone && <small><a href={`tel:${booking.passengerPhone.replace(/[^+\d]/g, '')}`}>{booking.passengerPhone}</a></small>}</dd></div>
          <div><dt>Booking total</dt><dd>{booking.currency} {Number(booking.amount).toFixed(2)}</dd></div>
          {booking.durationHours && <div><dt>Duration</dt><dd>{booking.durationHours} hours</dd></div>}
          {booking.pickupSign && <div><dt>Pick-up sign</dt><dd>{booking.pickupSign}</dd></div>}
        </dl>
      </section>
      {booking.journeys.map(journey => <section className={styles.card} key={journey.sequence}>
        <h2>Journey {journey.sequence}</h2>
        <dl className={styles.details}>
          <div><dt>Pick-up</dt><dd>{journey.pickup}</dd></div>
          {journey.stops.map((stop, index) => <div key={index}><dt>Stop {index + 1}</dt><dd>{stop}</dd></div>)}
          {journey.dropoff && <div><dt>Drop-off</dt><dd>{journey.dropoff}</dd></div>}
          <div><dt>Date &amp; time</dt><dd>{journey.flightBased ? `To be confirmed from flight ${journey.flight}` : `${journey.date} at ${journey.time}`}<small>{journey.timezone}</small></dd></div>
          {journey.flight && !journey.flightBased && <div><dt>Flight</dt><dd>{journey.flight}</dd></div>}
          <div><dt>Passengers</dt><dd>{journey.passengers}</dd></div>
        </dl>
      </section>)}
      {booking.chauffeurNote && <section className={styles.card}><h2>Chauffeur notes</h2><p className={styles.notes}>{booking.chauffeurNote}</p></section>}
      <p className={styles.footer}>Keep this link private. Contact Limo804 dispatch about any changes.</p>
    </main>
  </div>;
}
