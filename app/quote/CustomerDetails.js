'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Minus, Plus } from 'lucide-react';
import { validateCustomer } from './customer';

const initialDetails = { firstName: '', lastName: '', countryCode: '+61', mobile: '', email: '', someoneElse: false, bookerName: '', bookerEmail: '', signName: '', chauffeurNote: '', reference: '', voucher: '' };

export default function CustomerDetails({ active, onBack, onComplete }) {
  const [details, setDetails] = useState(initialDetails);
  const [expanded, setExpanded] = useState({});
  const headingRef = useRef(null);
  useEffect(() => { if (active) { headingRef.current?.focus(); headingRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); } }, [active]);
  function update(name, value) { setDetails(current => ({ ...current, [name]: value })); }
  function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    for (const field of form.elements) field.setCustomValidity?.('');
    const error = validateCustomer(details);
    if (error) {
      const field = form.elements.namedItem(error.field);
      field.setCustomValidity(error.message);
      field.reportValidity();
      return;
    }
    if (!form.reportValidity()) return;
    onComplete(Object.fromEntries(Object.entries(details).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])));
  }
  const textField = (name, label, type = 'text', autoComplete = undefined) => <label className="customer-field"><span>{label}</span><input name={name} type={type} value={details[name]} onChange={e => update(name, e.target.value)} required autoComplete={autoComplete} maxLength={type === 'email' ? 254 : 100} /></label>;

  return <section className="customer-card" aria-labelledby="customer-heading">
    <div className="customer-heading"><p className="eyebrow">Your journey, your details</p><h2 id="customer-heading" ref={headingRef} tabIndex={-1}>Who’s travelling?</h2><p>{details.someoneElse ? 'Enter the passenger’s details below.' : 'Add your contact details so our team can arrange your journey.'}</p></div>
    <form noValidate onSubmit={submit} onInput={e => { for (const field of e.currentTarget.elements) field.setCustomValidity?.(''); }}>
      <label className="someone-else"><input type="checkbox" checked={details.someoneElse} onChange={e => update('someoneElse', e.target.checked)} /><span>Booking for someone else<small>Tick this if the passenger isn’t you.</small></span></label>
      <div className="customer-grid">
        {textField('firstName', 'First name', 'text', 'given-name')}
        {textField('lastName', 'Last name', 'text', 'family-name')}
        <label className="customer-field mobile-field"><span>Mobile</span><span className="mobile-input"><select name="countryCode" aria-label="Mobile country code" value={details.countryCode} onChange={e => update('countryCode', e.target.value)}>{[['+61','AU'],['+64','NZ'],['+44','UK'],['+1','US / Canada'],['+65','Singapore'],['+91','India'],['+86','China'],['+81','Japan'],['+971','UAE']].map(([code, country]) => <option key={code} value={code}>{country} {code}</option>)}</select><input name="mobile" type="tel" inputMode="tel" autoComplete="tel-national" value={details.mobile} onChange={e => update('mobile', e.target.value)} required maxLength={30} aria-label="Mobile number" /></span></label>
        {textField('email', 'Email', 'email', 'email')}
      </div>
      {details.someoneElse && <fieldset className="booker-details"><legend>Your contact details</legend><p>Who should our team contact about this booking?</p><div className="customer-grid">{textField('bookerName', 'Your full name', 'text', 'section-booker name')}{textField('bookerEmail', 'Your email', 'email', 'section-booker email')}</div></fieldset>}
      <div className="customer-extras"><h3>Anything else? <span>Optional</span></h3><label className="customer-field sign-field"><span>Name on the pick-up sign</span><input name="signName" value={details.signName} onChange={e => update('signName', e.target.value)} maxLength={100} autoComplete="off" aria-describedby="sign-help" /></label><p id="sign-help">Add the name you’d like on your chauffeur’s pick-up sign.</p>
        <div className="customer-accordions">{[{ name: 'chauffeurNote', label: 'Note for your chauffeur', multiline: true }, { name: 'reference', label: 'Reference' }, { name: 'voucher', label: 'Voucher or discount code' }].map(({ name, label, multiline }) => <div className="customer-accordion" key={name}><button type="button" aria-expanded={!!expanded[name]} aria-controls={`customer-${name}`} onClick={() => setExpanded(current => ({ ...current, [name]: !current[name] }))}><span>{label}{details[name].trim() && <small>Added</small>}</span><span className="accordion-symbol">{expanded[name] ? <Minus size={13} /> : <Plus size={13} />}</span></button><div id={`customer-${name}`} hidden={!expanded[name]} className="customer-accordion-content"><label><span className="sr-only">{label}</span>{multiline ? <textarea name={name} value={details[name]} onChange={e => update(name, e.target.value)} maxLength={1000} rows={3} placeholder="Anything your chauffeur should know?" /> : <input name={name} value={details[name]} onChange={e => update(name, e.target.value)} maxLength={100} placeholder={label} />}</label>{name === 'voucher' && <p>Any discount is subject to confirmation by our team.</p>}</div></div>)}</div>
      </div>
      <div className="customer-actions"><button type="button" className="back-to-trip" onClick={onBack}><ArrowLeft size={17} />Back to trip</button><button type="submit" className="gold-button">Continue to review <ArrowRight size={17} /></button></div>
      <p className="customer-local-note">Your details are sent only when you choose Send quote request on the final review.</p>
    </form>
  </section>;
}
