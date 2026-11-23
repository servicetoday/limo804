'use client';
import { useState } from 'react';
import { Check, ShieldCheck } from 'lucide-react';

export default function ConfirmQuote({ token, quote }) {
  const [agreed, setAgreed] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [booking, setBooking] = useState(quote.booking);
  async function confirm(event) {
    event.preventDefault(); if (!agreed || busy) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/customer/quote/accept', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, accepted: true }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Your booking could not be confirmed.');
      setBooking(data.booking);
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  if (booking) return <section className="customer-confirmation" role="status"><span className="summary-icon"><Check size={25} /></span><h2>Your booking is {booking.status}.</h2><p>Booking reference</p><strong>{booking.reference}</strong><p>Please keep this reference for any enquiries. Vehicle and chauffeur assignment will be arranged separately.</p>{quote.isTest && <p className="customer-test-note">This is a dummy test booking. No vehicle will be dispatched.</p>}</section>;
  if (quote.state !== 'active') return <section className="customer-quote-unavailable"><h2>{quote.state === 'expired' ? 'This quote has expired.' : 'This quote has been updated.'}</h2><p>Please use the latest quote email or contact our team for a new quote. This link cannot confirm a booking.</p></section>;
  return <form className="customer-confirm-form" onSubmit={confirm}><p><ShieldCheck size={18} />Confirm the journeys and price above before continuing.</p><label><input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} required disabled={busy} /><span>I accept this quote for <strong>{quote.currency} {quote.amount}</strong> and want to confirm my booking.</span></label>{error && <p className="admin-error" role="alert">{error}</p>}<button type="submit" className="gold-button" disabled={!agreed || busy}>{busy ? 'Confirming…' : `Confirm booking · ${quote.currency} ${quote.amount}`}</button><small>No payment is taken on this page.</small></form>;
}
