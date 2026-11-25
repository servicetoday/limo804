'use client';

import { useRef, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import styles from './contact.module.css';

export default function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const submissionKey = useRef(null);
  const inFlight = useRef(false);

  async function submit(event) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    inFlight.current = true;
    setBusy(true); setError('');
    submissionKey.current ||= crypto.randomUUID();
    try {
      const details = Object.fromEntries(new FormData(form));
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...details, submissionKey: submissionKey.current }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Please try again or contact our team directly.');
      setReceipt(result);
      requestAnimationFrame(() => document.getElementById('contact-success')?.focus());
    } catch (error) { setError(error.message || 'We could not send your message. Please try again.'); }
    finally { inFlight.current = false; setBusy(false); }
  }

  if (receipt) return <div className={styles.success}>
    <CheckCircle2 size={34} />
    <h2 id="contact-success" tabIndex={-1}>Message sent.</h2>
    <p>Thank you for getting in touch. Our team will respond using the contact details you provided.</p>
    {receipt.reference && <small>Reference: {receipt.reference}</small>}
    <button type="button" onClick={() => { setReceipt(null); submissionKey.current = null; }}>Send another message</button>
  </div>;

  return <form className={styles.form} onSubmit={submit} onInput={() => { if (!inFlight.current) submissionKey.current = null; }}>
    <div className={styles.formHeading}><h2>Send us a message</h2><p>Tell us how we can help.</p></div>
    <div className={styles.fields}>
      <label>Your name<input name="name" autoComplete="name" maxLength={100} required placeholder="Full name" /></label>
      <label>Email address<input name="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" /></label>
      <label className={styles.full}>Phone number <span>Optional</span><input name="phone" type="tel" autoComplete="tel" maxLength={30} placeholder="Your contact number" /></label>
      <label className={styles.full}>Message<textarea name="message" rows={6} maxLength={5000} required placeholder="How can we help with your journey?" /></label>
    </div>
    <div className={styles.honeypot} aria-hidden="true"><label>Leave this field blank<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.formFooter}><p>Your message goes directly to our team.</p><button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send message'}<ArrowRight size={17} /></button></div>
  </form>;
}
