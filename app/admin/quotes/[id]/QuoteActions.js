'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { statusTransitions } from '../../../../lib/quote-validation';

export default function QuoteActions({ quote, vehicles = [] }) {
  const router = useRouter();
  const [vehicle, setVehicle] = useState(String(quote.preferred_fleet_id || ''));
  useEffect(() => { setVehicle(String(quote.preferred_fleet_id || '')); }, [quote.preferred_fleet_id]);
  const [status, setStatus] = useState(quote.status);
  const [amount, setAmount] = useState(quote.quoted_total || '');
  const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [recipient, setRecipient] = useState(quote.customer_snapshot.email);
  const [customerLink, setCustomerLink] = useState('');
  useEffect(() => { setStatus(quote.status); setAmount(quote.quoted_total ?? ''); }, [quote.status, quote.quoted_total]);
  async function request(url, options) {
    const response = await fetch(url, options); const data = await response.json();
    if (response.status === 401) router.replace('/admin/login');
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await request(`/api/admin/quotes/${quote.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, quotedTotal: amount === '' ? null : amount, note, preferredFleetId: vehicle || null }) });
      setNotice('Quote updated.'); setNote(''); router.refresh();
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  async function saveVehicle(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await request('/api/admin/quotes/' + quote.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: quote.status, preferredFleetId: vehicle || null, note: 'Vehicle preference updated.' }) });
      setNotice('Vehicle preference saved.'); router.refresh();
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  async function convert() {
    setBusy(true); setError(''); setNotice('');
    try { if (vehicle !== String(quote.preferred_fleet_id || '') || (!vehicle && quote.preferred_category)) await request('/api/admin/quotes/' + quote.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: quote.status, preferredFleetId: vehicle || null }) }); const data = await request(`/api/admin/quotes/${quote.id}/convert`, { method: 'POST' }); setNotice(`Pending booking ${data.booking.reference} created.`); router.refresh(); }
    catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  async function priceAndSend(sendEmail = true) {
    setBusy(true); setError(''); setNotice('');
    try {
      if (amount === '') throw new Error('Enter the quote amount first.');
      if ((vehicle !== String(quote.preferred_fleet_id || '') || (!vehicle && quote.preferred_category))) await request('/api/admin/quotes/' + quote.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: quote.status, preferredFleetId: vehicle || null }) });
      const data = await request(`/api/admin/quotes/${quote.id}/offer`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, recipient, sendEmail }) });
      setCustomerLink(data.offer.url);
      if (data.error) setError(data.error);
      else setNotice(sendEmail ? 'Price saved and customer quote email accepted by Mailtrap.' : 'Price saved. The private customer preview is ready.');
      router.refresh();
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  async function emailCustomer(emailType = 'acknowledgement') {
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await request(`/api/admin/quotes/${quote.id}/email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipient, emailType }) });
      setNotice(data.repeated ? 'This acknowledgement was already accepted by Mailtrap.' : 'Mailtrap accepted the email for delivery.'); router.refresh();
    } catch (error) { setError(error.message); router.refresh(); } finally { setBusy(false); }
  }
  return <section className="admin-editor"><h2 className="quote-section-title">Manage this quote</h2>{!quote.booking && <form className="admin-form quote-vehicle-form" onSubmit={saveVehicle}><label>Vehicle preference (optional)<select value={vehicle} disabled={busy} onChange={event => setVehicle(event.target.value)}><option value="">Any vehicle</option>{quote.preferred_fleet_id && !vehicles.some(item => item.id === quote.preferred_fleet_id) && <option value={quote.preferred_fleet_id} disabled>{quote.vehicle_name_snapshot || 'Unavailable vehicle'}</option>}{vehicles.filter(item => item.isActive || item.id === quote.preferred_fleet_id).map(item => <option key={item.id} value={item.id} disabled={!item.isActive}>{item.name}{!item.isActive ? ' (unavailable)' : ''}</option>)}</select></label><button className="gold-button" disabled={busy}>Save vehicle preference</button></form>}{error && <p className="admin-error" role="alert">{error}</p>}{notice && <p className="admin-notice" role="status">{notice}</p>}{!quote.booking && <div className="admin-price-offer"><h3>Set price & email customer</h3><p>Send a seven-day private link to view the price, review the journey and confirm a booking.</p><form className="admin-form" onSubmit={event => { event.preventDefault(); priceAndSend(); }}><fieldset disabled={busy || !['submitted', 'quoted'].includes(quote.status)}><label>Quote amount (AUD)<input type="number" step="0.01" min="0" max="99999999.99" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 150.00" required /></label><label>Customer email<input type="email" value={recipient} onChange={e => setRecipient(e.target.value)} maxLength={254} required /></label><button className="gold-button" type="submit">Save price & send quote</button><button type="button" className="admin-text-button" onClick={() => priceAndSend(false)}>Save price & preview customer page</button></fieldset></form>{customerLink && <a className="customer-preview-link" href={customerLink} target="_blank" rel="noreferrer">Open private customer quote preview</a>}</div>}<div className="quote-email-controls"><h3>Email acknowledgement</h3><label>Recipient<input type="email" value={recipient} onChange={e => setRecipient(e.target.value)} maxLength={254} /></label><button className="gold-button" type="button" disabled={busy || !recipient} onClick={() => emailCustomer()}>Send acknowledgement</button>{quote.booking && <button className="gold-button" type="button" disabled={busy || !recipient} onClick={() => emailCustomer('booking_update')}>Send booking email</button>}<p>Accepted means Mailtrap has queued the email. Delivery is tracked in Mailtrap.</p>{quote.emails?.map(email => <div className="quote-email-record" key={email.id}><strong>{email.recipient}</strong><span>{email.email_type} / {email.status} / {email.sender}</span>{email.last_error && <small>{email.last_error}</small>}{email.provider_message_id && <small>Message: {email.provider_message_id}</small>}</div>)}</div>{quote.booking ? <div className="quote-booking-summary"><p>Booking reference</p><strong>{quote.booking.reference}</strong><p>Status: {quote.booking.status}</p><p>{quote.booking.status === 'confirmed' ? 'Confirmed by the customer.' : 'Created from this quote; check the booking status before dispatch.'}</p><p>{quote.booking.assigned_driver_id ? (quote.booking.assigned_fleet_id ? 'A driver and vehicle are assigned.' : 'A driver is assigned; no vehicle selected.') : 'Driver assignment is still required.'}</p><Link className="customer-preview-link" href="/admin/bookings">Manage driver assignment and email</Link></div> : <><form className="admin-form" onSubmit={save}><fieldset disabled={busy}><label>Status<select value={status} onChange={e => setStatus(e.target.value)}>{(statusTransitions[quote.status] || []).map(value => <option key={value} value={value}>{value}</option>)}</select></label><label>Quote total (AUD)<input type="number" value={amount} onChange={e => setAmount(e.target.value)} step="0.01" min="0" max="99999999.99" placeholder="Not priced yet" /></label><label>Internal status note<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={1000} rows={3} /></label>{status === 'accepted' && quote.status !== 'accepted' && <label className="admin-checkbox"><input type="checkbox" required /><span>I have confirmed the customer’s acceptance.<small>This records an acceptance arranged outside the website.</small></span></label>}<button className="gold-button" type="submit">{busy ? 'Saving…' : 'Save quote status'}</button></fieldset></form><div className="quote-convert"><h3>Ready to become a booking?</h3><p>Set a price, mark the quote as quoted, then record the customer’s acceptance. Conversion creates one pending booking and preserves this quote.</p><button type="button" className="gold-button" disabled={busy || quote.status !== 'accepted'} onClick={convert}>Create pending booking</button></div></>}</section>;
}
