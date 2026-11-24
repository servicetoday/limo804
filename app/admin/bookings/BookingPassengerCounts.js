'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { passengerCounts } from '../../../lib/passenger-count';

export default function BookingPassengerCounts({ booking }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const closed = ['cancelled', 'completed'].includes(booking.status);
  const blocked = ['sending', 'unknown'].includes(booking.driver_email_status);

  async function save(journey, value) {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}/passengers`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ journeyId: journey.id, passengers: Number(value), previousPassengers: journey.passengers }) });
      const data = await response.json();
      if (response.status === 401) { router.replace('/admin/login'); return; }
      if (!response.ok) throw new Error(data.error || 'Could not save the passenger count.');
      setNotice(booking.assigned_driver_id ? 'Saved. Use Email driver to send the updated details.' : 'Passenger count saved.');
      router.refresh();
    } catch (error) { setError(error.message); router.refresh(); }
    finally { setBusy(false); }
  }

  return <div className="booking-passenger-counts">
    {booking.journeys.map(journey => <label key={journey.id}>
      <span>{journey.leg_type === 'return' ? 'Return' : `Trip ${journey.sequence_number}`}</span>
      <select aria-label={`Passengers for ${booking.reference}, trip ${journey.sequence_number}`} value={journey.passengers} disabled={busy || closed || blocked} onChange={event => save(journey, event.target.value)}>
        {passengerCounts.map(count => <option key={count} value={count}>{count} passenger{count === 1 ? '' : 's'}</option>)}
      </select>
    </label>)}
    {busy && <small role="status">Saving…</small>}
    {notice && <small role="status">{notice}</small>}
    {error && <small className="booking-passenger-error" role="alert">{error}</small>}
  </div>;
}
