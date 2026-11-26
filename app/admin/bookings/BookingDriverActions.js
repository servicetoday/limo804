'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BookingDriverActions({ booking, drivers, vehicles }) {
  const router = useRouter();
  const [selected, setSelected] = useState(String(booking.assigned_driver_id || ''));
  const [vehicle, setVehicle] = useState(String(booking.assigned_fleet_id || ''));
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const changed = selected !== String(booking.assigned_driver_id || '') || vehicle !== String(booking.assigned_fleet_id || '');
  const visibleDrivers = vehicle ? drivers.filter(driver => String(driver.assigned_fleet_id) === vehicle && driver.vehicle_available) : drivers;
  const closed = ['cancelled', 'completed'].includes(booking.status);
  const blocked = ['sending', 'unknown'].includes(booking.driver_email_status);
  useEffect(() => { setSelected(String(booking.assigned_driver_id || '')); setVehicle(String(booking.assigned_fleet_id || '')); }, [booking.assigned_driver_id, booking.assigned_fleet_id, booking.driver_assignment_version]);
  async function act(action = 'assignment') {
    const email = action === 'email', sms = action === 'sms';
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}/${email ? 'driver-email' : sms ? 'driver-sms' : 'driver'}`, { method: email || sms ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, ...(email ? {} : { body: JSON.stringify(sms ? { assignmentVersion: booking.driver_assignment_version } : { driverId: selected || null, fleetId: vehicle || null }) }) });
      const data = await response.json();
      if (response.status === 401) { router.replace('/admin/login'); return; }
      if (!response.ok) throw new Error(data.error || 'Could not complete this action.');
      if (sms) {
        setNotice(`SMS accepted by ClickSend for ${data.recipient}. Delivery may be delayed while awaiting provider approval.`);
        router.refresh(); return;
      }
      const notification = email ? data : data.email;
      const smsAccepted = (data.sms || []).filter(result => result.status === 'accepted');
      const smsNotice = smsAccepted.map(result => `${result.notificationType === 'unassigned' ? 'Unassignment SMS' : 'Assignment SMS'} accepted by ClickSend for ${result.recipient}.`).join(' ');
      setNotice([notification ? `${email ? '' : 'Assignment saved. '}${notification.notificationType === 'unassigned' ? 'Unassignment email' : 'Email'} accepted by Mailtrap for ${notification.recipient}.` : 'Assignment saved.', smsNotice].filter(Boolean).join(' '));
      const failures = [data.emailError && `Driver email was not confirmed: ${data.emailError}`, data.smsError && `Driver SMS was not confirmed: ${data.smsError}`].filter(Boolean);
      if (failures.length) setError(`Assignment saved. ${failures.join(' ')}`);
      router.refresh();
    } catch (error) { setError(error.message); router.refresh(); } finally { setBusy(false); }
  }
  return <div className="booking-driver-actions">
    <strong>{booking.driver_name || 'No driver assigned'}</strong>
    {!booking.assigned_driver_id && booking.unassigned_driver_name && <small>Previously assigned: {booking.unassigned_driver_name}</small>}
    {!closed && <>
      <label htmlFor={`vehicle-${booking.id}`}>Vehicle (optional)</label>
      <select id={`vehicle-${booking.id}`} value={vehicle} disabled={busy || blocked} onChange={event => {
        const value = event.target.value; setVehicle(value); setNotice(''); setError('');
        if (value && !drivers.some(driver => String(driver.id) === selected && String(driver.assigned_fleet_id) === value && driver.vehicle_available)) setSelected('');
      }}>
        <option value="">Any vehicle</option>
        {booking.assigned_fleet_id && !vehicles.some(item => item.id === booking.assigned_fleet_id) && <option value={booking.assigned_fleet_id} disabled>{booking.vehicle_name || 'Unavailable vehicle'}</option>}
        {vehicles.filter(item => item.isActive || item.id === booking.assigned_fleet_id).map(item => <option key={item.id} value={item.id} disabled={!item.isActive}>{item.name}{!item.isActive ? ' (unavailable)' : ''}</option>)}
      </select>
      <small>{vehicle ? 'Drivers attached to this vehicle are shown.' : 'All drivers can be assigned; no vehicle is required.'}</small>
      <label className="sr-only" htmlFor={`driver-${booking.id}`}>Driver for booking {booking.reference}</label>
      <select id={`driver-${booking.id}`} value={selected} onChange={event => { setSelected(event.target.value); setNotice(''); setError(''); }} disabled={busy || blocked}>
        <option value="">Unassigned</option>{visibleDrivers.map(driver => <option key={driver.id} value={driver.id}>{driver.name} — {driver.vehicle_name || 'no vehicle'}</option>)}
      </select>
      {!drivers.length && <Link href="/admin/drivers">Add a driver</Link>}
      {vehicle && !visibleDrivers.length && <small>No drivers attached to this vehicle. Select Any vehicle to choose from all drivers.</small>}
      <button className="driver-edit-button" disabled={busy || blocked} onClick={() => act()}>Save assignment</button>
      <div className="driver-notification-buttons">
        <button className="gold-button" disabled={busy || changed || (!booking.assigned_driver_id && !booking.unassigned_driver_name) || booking.driver_email_status === 'sending'} onClick={() => act('email')}>Email driver</button>
        <button className="gold-button" disabled={busy || changed || !booking.assigned_driver_id} onClick={() => act('sms')}>SMS driver</button>
      </div>
      <small>Saving sends email and SMS together. Email driver resends the email. SMS driver sends the current driver a fresh private booking link.</small>
      {changed && <small>Save the assignment before sending notifications.</small>}
    </>}
    <small>{booking.driver_email ? `Emails go to ${booking.driver_email}` : 'Add an email address to the driver profile to receive assignment emails.'}</small>
    {booking.driver_email_status && <small>{({ accepted: 'Email accepted by Mailtrap', failed: 'Email failed; you can retry', unknown: 'Previous delivery is uncertain. Email driver will send another copy.', sending: 'Email is sending', pending: 'Email pending' })[booking.driver_email_status]}</small>}
    {booking.driver_email_error && <small>{booking.driver_email_error}</small>}
    {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
  </div>;
}
