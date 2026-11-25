'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const empty = { name: '', email: '', phone: '', address: '', assignedFleetId: '', registration: '' };
export default function DriverManager({ initialDrivers, vehicles }) {
  const router = useRouter();
  const [drivers, setDrivers] = useState(initialDrivers);
  const [form, setForm] = useState(empty), [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const nameInput = useRef(null);
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  function edit(driver) {
    setEditingId(driver.id); setForm({ name: driver.name, email: driver.email || '', phone: driver.phone, address: driver.address || '', assignedFleetId: driver.assigned_fleet_id || '', registration: driver.vehicle_registration || '' });
    setError(''); setNotice(''); nameInput.current?.focus();
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(editingId ? `/api/admin/drivers/${editingId}` : '/api/admin/drivers', { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json();
      if (response.status === 401) { router.replace('/admin/login'); return; }
      if (!response.ok) throw new Error(data.error || 'Could not save driver.');
      const list = await fetch('/api/admin/drivers', { cache: 'no-store' });
      const result = await list.json(); if (!list.ok) throw new Error(result.error || 'Could not reload drivers.');
      setDrivers(result.drivers); setForm(empty); setEditingId(null); setNotice('Driver saved.'); router.refresh();
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  const chosen = vehicles.find(vehicle => vehicle.id === Number(form.assignedFleetId));
  return <div className="admin-columns">
    <section className="admin-inventory"><h2 className="quote-section-title">Driver list</h2>
      {drivers.length === 0 ? <p>No drivers yet. Add your first driver using the form.</p> : <div className="quote-table-scroll"><table className="quote-admin-table driver-table"><thead><tr><th scope="col">Driver</th><th scope="col">Vehicle</th><th scope="col">Rego</th><th scope="col">Contact</th><th scope="col">Action</th></tr></thead><tbody>{drivers.map(driver => <tr key={driver.id}><td>{driver.name}</td><td>{driver.vehicle_name || 'Unassigned'}{driver.assigned_fleet_id && !driver.vehicle_available ? <small>Vehicle unavailable</small> : null}</td><td>{driver.vehicle_registration || 'Not provided'}</td><td>{driver.phone}{driver.email && <small>{driver.email}</small>}</td><td><button className="driver-edit-button" disabled={busy} onClick={() => edit(driver)} aria-label={`Edit ${driver.name}`}>Edit</button></td></tr>)}</tbody></table></div>}
    </section>
    <section className="admin-inventory"><h2 className="quote-section-title">{editingId ? 'Edit driver' : 'Add driver'}</h2>
      <form className="admin-form" onSubmit={save}>
        <label>Name<input ref={nameInput} value={form.name} onChange={event => update('name', event.target.value)} maxLength={150} required /></label>
        <label>Phone<input type="tel" value={form.phone} onChange={event => update('phone', event.target.value)} maxLength={30} required /></label>
        <label>Email (optional)<input type="email" name="email" autoComplete="email" value={form.email} onChange={event => update('email', event.target.value)} maxLength={254} placeholder="driver@example.com" /></label>
        <label>Address<textarea value={form.address} onChange={event => update('address', event.target.value)} maxLength={500} rows={2} /></label>
        <label>Vehicle registration (number plate)<input value={form.registration} onChange={event => update('registration', event.target.value.toUpperCase())} maxLength={20} autoCapitalize="characters" spellCheck={false} placeholder="e.g. ABC 123" /><small>Optional. Enter the number plate of the car this driver uses.</small></label>
        <label>Attached vehicle (optional)<select value={form.assignedFleetId} onChange={event => update('assignedFleetId', event.target.value)}><option value="">No vehicle attached</option>{vehicles.filter(vehicle => vehicle.isActive || vehicle.id === Number(form.assignedFleetId)).map(vehicle => <option key={vehicle.id} value={vehicle.id} disabled={!vehicle.isActive}>{vehicle.name} · {vehicle.passengers} passengers{!vehicle.isActive ? ' (unpublished)' : ''}</option>)}</select></label>
        {form.assignedFleetId && !chosen && <p className="admin-error">The attached vehicle is unavailable. Choose another vehicle or clear the assignment.</p>}
        <p className="driver-help">Attaching a vehicle makes this driver available for bookings for that vehicle. With Any vehicle selected on a booking, this driver can be assigned without an attached vehicle.</p>
        {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}
        <div className="driver-form-actions"><button className="gold-button" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save driver'}</button>{editingId && <button type="button" disabled={busy} onClick={() => { setForm(empty); setEditingId(null); setError(''); }}>Cancel edit</button>}</div>
      </form>
    </section>
  </div>;
}
