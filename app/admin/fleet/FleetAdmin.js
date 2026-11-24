'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CarFront, Edit3, LogOut, Plus, Upload } from 'lucide-react';
import Logo from '../../components/Logo';

const emptyVehicle = { name: '', category: 'sedan', passengers: 3, suitcases: 3, image: '', imageAlt: '', tagline: '', description: '', details: '', features: [], isActive: false, sortOrder: 0 };

export default function FleetAdmin({ initialVehicles, initialError }) {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [vehicle, setVehicle] = useState({ ...emptyVehicle });
  const [editingId, setEditingId] = useState(null);
  const [featureText, setFeatureText] = useState('');
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const editorRef = useRef(null);
  const router = useRouter();

  function update(name, value) { setVehicle(current => ({ ...current, [name]: value })); }
  async function api(url, options = {}) {
    const response = await fetch(url, options);
    const result = await response.json();
    if (response.status === 401) { router.replace('/admin/login'); throw new Error('Your session expired. Please sign in again.'); }
    if (!response.ok) throw new Error(result.error || 'The request failed.');
    return result;
  }
  function reset() { setVehicle({ ...emptyVehicle }); setEditingId(null); setFeatureText(''); }
  async function reload() { const data = await api('/api/admin/fleet'); setVehicles(data.vehicles); }
  function edit(item) {
    setVehicle({ ...item }); setEditingId(item.id); setFeatureText(item.features.join('\n')); setError(''); setNotice('');
    editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('fleet-name')?.focus({ preventScroll: true });
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const payload = { ...vehicle, features: featureText.split('\n').map(value => value.trim()).filter(Boolean) };
      await api(editingId ? `/api/admin/fleet/${editingId}` : '/api/admin/fleet', { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      await reload(); setNotice(editingId ? 'Vehicle updated.' : 'Vehicle added.'); reset(); router.refresh();
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  async function archive(item) {
    if (!window.confirm(`Archive “${item.name}”? It will be removed from the public fleet.`)) return;
    setBusy(true); setError(''); setNotice('');
    try { await api(`/api/admin/fleet/${item.id}`, { method: 'DELETE' }); await reload(); if (editingId === item.id) reset(); setNotice('Vehicle archived.'); router.refresh(); }
    catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  async function toggle(item) {
    setBusy(true); setError(''); setNotice('');
    try { await api(`/api/admin/fleet/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...item, isActive: !item.isActive }) }); await reload(); if (editingId === item.id) update('isActive', !item.isActive); setNotice(item.isActive ? 'Vehicle unpublished.' : 'Vehicle published.'); router.refresh(); }
    catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  async function upload(event) {
    const file = event.target.files?.[0]; if (!file) return;
    setUploading(true); setError('');
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Choose an image under 5 MB.');
      const body = new FormData(); body.append('image', file);
      const data = await api('/api/admin/uploads', { method: 'POST', body });
      update('image', data.image); setNotice('Image uploaded. Save the vehicle to use it.');
    } catch (error) { setError(error.message); } finally { setUploading(false); event.target.value = ''; }
  }
  async function logout() {
    try { await api('/api/admin/auth/logout', { method: 'POST' }); router.replace('/admin/login'); router.refresh(); } catch (error) { setError(error.message); }
  }
  const field = (name, label, options = {}) => <label>{label}<input id={name === 'name' ? 'fleet-name' : undefined} value={vehicle[name]} onChange={event => update(name, event.target.value)} {...options} /></label>;

  return <div className="admin-shell">
    <header className="admin-header"><Logo /><div><Link href="/admin/bookings">Bookings</Link><Link href="/admin/drivers">Drivers</Link><Link href="/admin/quotes">Quote requests</Link><Link href="/fleet" target="_blank" rel="noopener noreferrer">View public fleet</Link><button type="button" onClick={logout}><LogOut size={16} />Sign out</button></div></header>
    <main className="admin-main"><div className="admin-title"><div><p className="eyebrow">Limo804 administration</p><h1>Fleet manager</h1><p>Add vehicles, update capacities and choose what appears on your website.</p></div><span>{vehicles.length} vehicle{vehicles.length === 1 ? '' : 's'}</span></div>
      <div aria-live="polite">{error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}</div>
      <div className="admin-columns">
        <section className="admin-editor" ref={editorRef}><div className="admin-panel-title"><h2>{editingId ? 'Edit vehicle' : 'Add a vehicle'}</h2>{editingId && <button type="button" className="admin-text-button" onClick={reset}><Plus size={15} />Add new instead</button>}</div>
          <form className="admin-form" onSubmit={save}><fieldset disabled={busy || uploading}>
            {field('name', 'Vehicle name', { required: true, maxLength: 120, placeholder: 'e.g. Mercedes-Benz E-Class' })}
            <div className="admin-form-grid"><label>Category<select value={vehicle.category} onChange={e => update('category', e.target.value)}><option value="sedan">Sedans</option><option value="suv">Luxury SUVs</option></select></label>{field('sortOrder', 'Display order', { type: 'number', min: 0, max: 9999, required: true })}</div>
            <div className="admin-form-grid">{field('passengers', 'Passengers', { type: 'number', min: 1, max: 7, required: true })}{field('suitcases', 'Suitcases', { type: 'number', min: 0, max: 20, required: true })}</div>
            <div className="admin-image-field"><label>Vehicle image<input value={vehicle.image} onChange={e => update('image', e.target.value)} required maxLength={1000} placeholder="HTTPS URL or upload an image below" /></label><label className="admin-upload"><Upload size={17} />{uploading ? 'Uploading…' : 'Upload image'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={busy || uploading} /></label><small>JPG, PNG or WebP · up to 5 MB. Local /images/ paths also work.</small>{vehicle.image && <img className="admin-image-preview" src={vehicle.image} alt={vehicle.imageAlt || 'Vehicle preview'} />}</div>
            {field('imageAlt', 'Image description', { maxLength: 200, placeholder: 'Describe the vehicle in the image' })}
            {field('tagline', 'Short tagline', { maxLength: 180 })}
            <label>Description<textarea rows={3} value={vehicle.description} onChange={e => update('description', e.target.value)} required maxLength={5000} /></label>
            <label>Features<textarea rows={3} value={featureText} onChange={e => setFeatureText(e.target.value)} placeholder="One feature per line (maximum 10)" maxLength={1610} /></label>
            <label>Additional details<textarea rows={3} value={vehicle.details} onChange={e => update('details', e.target.value)} maxLength={5000} /></label>
            <label className="admin-checkbox"><input type="checkbox" checked={vehicle.isActive} onChange={e => update('isActive', e.target.checked)} /><span>Publish on the fleet page<small>Leave unchecked to save as a draft.</small></span></label>
            <div className="admin-editor-actions"><button className="gold-button" type="submit">{busy ? 'Saving…' : editingId ? 'Save changes' : 'Add vehicle'}</button>{editingId && <button className="admin-text-button" type="button" onClick={reset}>Cancel editing</button>}</div>
          </fieldset></form>
        </section>
        <section className="admin-inventory"><div className="admin-panel-title"><h2>Your fleet</h2><span>{vehicles.filter(item => item.isActive).length} published</span></div>{vehicles.length === 0 ? <div className="admin-empty"><CarFront size={42} /><h3>Your fleet starts here.</h3><p>Add your first vehicle using the form. Publish it when it’s ready to appear on the website.</p></div> : <div className="admin-vehicle-list">{vehicles.map(item => <article key={item.id}><img src={item.image} alt={item.imageAlt || item.name} /><div><span className="admin-category">{item.category === 'sedan' ? 'Sedans' : 'Luxury SUVs'} · {item.isActive ? 'Published' : 'Draft'}</span><h3>{item.name}</h3><p>Up to {item.passengers} passengers · {item.suitcases} suitcases</p><div className="admin-item-actions"><button type="button" disabled={busy || uploading} onClick={() => edit(item)}><Edit3 size={14} />Edit</button><button type="button" disabled={busy || uploading} onClick={() => toggle(item)}>{item.isActive ? 'Unpublish' : 'Publish'}</button><button type="button" disabled={busy || uploading} onClick={() => archive(item)} className="admin-archive">Archive</button></div></div></article>)}</div>}</section>
      </div>
    </main>
  </div>;
}
