'use client';

import { useEffect, useRef, useState } from 'react';
import JourneyFields from './JourneyFields';
import JourneyMap from './JourneyMap';
import FareEstimate from './FareEstimate';
import { journeyFare, totalFares } from '../../lib/fare';
import CustomerDetails from './CustomerDetails';
import Link from 'next/link';
import { isAirportPickup, validateJourneys } from './booking';
import { ArrowRight, ArrowRightLeft, Camera, CarFront, Check, Clock3, FileText, Phone, Plus, Route, Upload, X } from 'lucide-react';

function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function QuoteForm({ initialVehicle = '', selectedFleet = null, vehicles = [] }) {
  const [vehicleChoice, setVehicleChoice] = useState(selectedFleet ? String(selectedFleet.id) : initialVehicle ? `category:${initialVehicle}` : '');
  const preferredFleet = vehicles.find(vehicle => String(vehicle.id) === vehicleChoice);
  const preferredCategory = preferredFleet?.category || (vehicleChoice.startsWith('category:') ? vehicleChoice.slice(9) : '');
  const [service, setService] = useState('transfer');
  const [journey, setJourney] = useState('one-way');
  const [returnRouteMetrics, setReturnRouteMetrics] = useState(null);
  const [returnWaitingMinutes, setReturnWaitingMinutes] = useState(0);
  const [legs, setLegs] = useState([{ id: 0, pickup: '', dropoff: '', date: '', time: '', passengers: 1, collapsed: false }]);
  const nextLeg = useRef(1);
  const multiTrip = service === 'transfer' && journey === 'multi-trip';
  const visibleLegs = multiTrip ? legs : legs.slice(0, 1);
  const oneWay = service === 'transfer' && journey === 'one-way';
  const returnLeg = { pickup: legs[0].dropoff, dropoff: legs[0].pickup, stops: [...(legs[0].stops || [])].reverse(), routeMetrics: returnRouteMetrics, waitingMinutes: returnWaitingMinutes };
  const fareTotal = service === 'transfer' ? totalFares([...visibleLegs.map(journeyFare), ...(journey === 'return' ? [journeyFare(returnLeg)] : [])]) : null;
  const reviewLegs = visibleLegs.map(leg => ({ ...leg, stops: service === 'transfer' ? (leg.stops || []) : [], flightNumber: oneWay && isAirportPickup(leg.pickup) && !leg.flightUnknown ? (leg.flightNumber || '') : '', flightScheduled: oneWay && isAirportPickup(leg.pickup) && !leg.flightUnknown && !leg.manualSchedule }));
  const [today, setToday] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [fileError, setFileError] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [flightText, setFlightText] = useState('');
  const [trip, setTrip] = useState(null);
  const [step, setStep] = useState('journey');
  const [customer, setCustomer] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const attachmentFile = useRef(null);
  const submissionKey = useRef(null);
  const dialogRef = useRef(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const lastFocus = useRef(null);

  useEffect(() => { setToday(localDate(new Date())); }, []);
  useEffect(() => {
    if (!trip || step !== 'review' || receipt) return;
    lastFocus.current = document.activeElement;
    dialogRef.current?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialogRef.current?.close();
      document.body.style.overflow = '';
      lastFocus.current?.focus();
    };
  }, [trip, step, receipt]);

  function chooseFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.type)) {
      setFileError('Choose a PDF, JPG, PNG, WebP or HEIC file.');
    } else if (file.size > 10 * 1024 * 1024) {
      setFileError('Please choose a file smaller than 10 MB.');
    } else {
      attachmentFile.current = file;
      setAttachment({ name: file.name, size: file.size });
      setFileError('');
    }
    event.target.value = '';
  }

  function updateLeg(id, updates) {
    setLegs(current => current.map(leg => leg.id === id ? { ...leg, ...updates } : leg));
  }

  function addTrip() {
    const id = nextLeg.current++;
    setLegs(current => [...current, { id, pickup: '', dropoff: '', date: '', time: '', passengers: 1, collapsed: false }]);
    requestAnimationFrame(() => document.getElementById(`leg-${id}-pickup`)?.focus());
  }

  function selectJourney(id) {
    setJourney(id);
    if (id === 'multi-trip' && legs.length === 1) addTrip();
  }

  function removeTrip(id) {
    const remaining = legs.filter(leg => leg.id !== id);
    if (!remaining.length) return;
    setLegs(remaining);
    requestAnimationFrame(() => document.getElementById(`trip-toggle-${remaining[0].id}`)?.focus());
  }

  function requestQuote(event) {
    event.preventDefault();
    const form = event.currentTarget;
    for (const field of form.elements) field.setCustomValidity?.('');
    const data = Object.fromEntries(new FormData(form));
    const error = validateJourneys(reviewLegs, { hourly: service === 'hourly', returnDate: journey === 'return' && service === 'transfer' ? data.returnDate : null, returnTime: data.returnTime });
    if (error) {
      updateLeg(error.id, { collapsed: false });
      requestAnimationFrame(() => {
        const name = error.field.startsWith('return') ? error.field : `leg-${error.id}-${error.field}`;
        const field = form.elements.namedItem(name);
        field?.setCustomValidity(error.message);
        field?.reportValidity();
      });
      return;
    }
    if (!form.reportValidity()) return;
    setTrip({ ...data, service, journey, fareEstimate: fareTotal, returnWaitingMinutes, legs: reviewLegs.map(leg => ({ ...leg, pickup: leg.pickup.trim(), dropoff: leg.dropoff.trim() })), attachment, flightText: flightText.trim() });
    submissionKey.current = null; setSubmitError('');
    setStep('details');
  }

  async function sendQuote() {
    if (submitting || !trip || !customer) return;
    setSubmitting(true); setSubmitError('');
    if (!submissionKey.current) submissionKey.current = crypto.randomUUID();
    try {
      const body = new FormData();
      body.set('payload', JSON.stringify({ submissionKey: submissionKey.current, trip, customer }));
      if (attachmentFile.current) body.set('attachment', attachmentFile.current);
      const response = await fetch('/api/quotes', { method: 'POST', body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save your quote request.');
      setReceipt(result);
      requestAnimationFrame(() => { document.getElementById('quote-saved-heading')?.focus(); document.getElementById('quote-saved-heading')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    } catch (error) { setSubmitError(error.message || 'Please try again. Your details are still here.'); }
    finally { setSubmitting(false); }
  }

  function backToTrip() {
    setStep('journey');
    requestAnimationFrame(() => document.getElementById('review-trip-button')?.focus());
  }

  if (receipt) return <section className="customer-card quote-saved-card"><span className="summary-icon"><Check size={26} /></span><p className="eyebrow">Request received</p><h2 id="quote-saved-heading" tabIndex={-1}>Thank you, {customer.firstName}.</h2><p>Your quote request has been saved. Our team can now review your journey and contact details.</p><div className="quote-reference"><span>Your quote reference</span><strong>{receipt.reference}</strong></div><p>Keep this reference for any enquiries. This is a quote request, not a confirmed booking.</p><div className="customer-actions"><Link className="gold-button" href="/">Back to home</Link><a className="back-to-trip" href="tel:13005466804"><Phone size={17} />Call our team</a></div></section>;

  return <>
    <nav className="booking-progress" aria-label="Booking progress"><button type="button" onClick={backToTrip} aria-current={step === 'journey' ? 'step' : undefined}><span>1</span>Your trip</button><span className="progress-line" /><span className={step !== 'journey' ? 'current' : ''} aria-current={step !== 'journey' ? 'step' : undefined}><span>2</span>Customer details</span></nav>
    <div hidden={step !== 'journey'}>
    <form id="booking" className="journey-card" noValidate onSubmit={requestQuote} onInput={event => { for (const field of event.currentTarget.elements) field.setCustomValidity?.(''); }}>
    <div className="planner-heading"><div><h2>Plan your journey</h2><p>A few details to get you on your way.</p></div>
    <div className="service-switch" role="group" aria-label="Booking service">
      <button type="button" className={service === 'transfer' ? 'selected' : ''} aria-pressed={service === 'transfer'} onClick={() => setService('transfer')}><CarFront size={17} />Transfer</button>
      <button type="button" className={service === 'hourly' ? 'selected' : ''} aria-pressed={service === 'hourly'} onClick={() => setService('hourly')}><Clock3 size={17} />By the hour</button>
    </div>
    </div>
      {service === 'transfer' ? <div className="journey-switch" role="group" aria-label="Journey type">
        {[{ id: 'one-way', label: 'One way', icon: ArrowRight }, { id: 'return', label: 'Return', icon: ArrowRightLeft }, { id: 'multi-trip', label: 'Multi-trip', icon: Route }].map(({ id, label, icon: Icon }) => <button type="button" key={id} className={journey === id ? 'selected' : ''} aria-pressed={journey === id} onClick={() => selectJourney(id)}><Icon size={16} />{label}{id === 'multi-trip' && journey === 'multi-trip' ? ` \u00b7 ${legs.length}` : ''}</button>)}
      </div> : <div className="hourly-intro"><h3>A chauffeur on your schedule</h3><p>Choose your pick-up and how long you need your vehicle.</p></div>}

      <div className="trip-list">
        {visibleLegs.map((leg, index) => <JourneyFields key={leg.id} leg={leg} index={index} multiTrip={multiTrip} oneWay={oneWay} hourly={service === 'hourly'} today={today} onChange={updates => updateLeg(leg.id, updates)} onRemove={() => removeTrip(leg.id)} canRemove={legs.length > 1} />)}
      </div>
      {oneWay && <button type="button" className="add-return-card" onClick={() => selectJourney('return')}><span className="return-symbol"><ArrowRightLeft size={18} /></span><span><strong>Travelling back too?</strong><small>Add your return ride now.</small></span><span className="return-plus"><Plus size={18} /></span></button>}
      {multiTrip && <button type="button" className="add-trip-button" disabled={legs.length >= 8} onClick={addTrip}><Plus size={17} />{legs.length >= 8 ? 'Maximum 8 trips' : 'Add a trip'}</button>}
      {service === 'transfer' && journey === 'return' && <fieldset className="return-schedule"><legend>Return journey</legend><p>Your return follows the same route back, including stops in reverse order.</p><div className="return-fields"><label className="schedule-box"><span className="journey-label">Return date</span><input name="returnDate" type="date" min={legs[0].date || today} required aria-label="Return date" /></label><label className="schedule-box"><span className="journey-label">Return time</span><input name="returnTime" type="time" required aria-label="Return time" /></label></div></fieldset>}
      {service === 'transfer' && journey === 'return' && <JourneyMap pickup={returnLeg.pickup} dropoff={returnLeg.dropoff} stops={returnLeg.stops} active={step === 'journey'} title="Return route" onRouteMetrics={setReturnRouteMetrics} waitingMinutes={returnWaitingMinutes} onWaitingChange={setReturnWaitingMinutes} waitingName="returnWaitingMinutes" />}
      {service === 'hourly' && <label className="schedule-box duration-box"><span className="journey-label">Duration</span><select name="hours" defaultValue="3" aria-label="Booking duration">{[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(hours => <option key={hours} value={hours}>{hours} hours</option>)}</select></label>}

      <div className="selected-vehicle"><label htmlFor="quote-vehicle"><CarFront size={18} />Vehicle preference (optional)</label><select id="quote-vehicle" value={vehicleChoice} onChange={event => setVehicleChoice(event.target.value)}><option value="">Any vehicle</option><option value="category:sedan">Sedans (any model)</option><option value="category:suv">Luxury SUVs (any model)</option>{vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.name}</option>)}</select><input type="hidden" name="vehiclePreference" value={preferredCategory} />{preferredFleet && <><input type="hidden" name="fleetId" value={preferredFleet.id} /><input type="hidden" name="fleetName" value={preferredFleet.name} /></>}</div>
      <details className="flight-details-panel">
        <summary><span><FileText size={17} /><span>Flight or itinerary details<small>{attachment ? attachment.name : flightText.trim() ? 'Itinerary text added' : 'Optional ? Attach a booking or add a note'}</small></span></span><Plus size={17} className="flight-details-toggle" /></summary>
      <div className="flight-banner">
        <div><h3>Flying? Add your booking.</h3><p>Attach your e-ticket, PDF or photo as a trip reference.</p></div>
        <div className="flight-actions"><button type="button" onClick={() => fileRef.current?.click()}><Upload size={15} />Choose a file</button><button type="button" onClick={() => cameraRef.current?.click()}><Camera size={15} />Take a photo</button><button type="button" aria-expanded={pasteOpen} aria-controls="flight-paste" onClick={() => setPasteOpen(!pasteOpen)}><FileText size={15} />Paste text</button></div>
        <input ref={fileRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif" onChange={chooseFile} aria-label="Attach flight booking" />
        <input ref={cameraRef} type="file" hidden accept="image/*" capture="environment" onChange={chooseFile} aria-label="Photograph flight booking" />
        {attachment && <div className="attachment-status" role="status"><FileText size={16} /><span>{attachment.name} · {Math.ceil(attachment.size / 1024)} KB</span><button type="button" aria-label="Remove flight attachment" onClick={() => { setAttachment(null); attachmentFile.current = null; }}><X size={16} /></button><small>Attached to your enquiry when you send the quote request. Files are not read automatically.</small></div>}
        {fileError && <p className="file-error" role="alert">{fileError}</p>}
        {pasteOpen && <label id="flight-paste" className="flight-paste"><span>Flight or itinerary details</span><textarea value={flightText} onChange={e => setFlightText(e.target.value)} maxLength={3000} rows={3} placeholder="Paste your flight number, arrival time or itinerary here…" /></label>}
      </div>
      </details>
      {service === 'transfer' && <FareEstimate fare={fareTotal} total />}
      <div className="journey-submit"><p>Next: your contact details</p><button id="review-trip-button" type="submit" className="gold-button">Continue <ArrowRight size={18} /></button></div>
    </form>
    </div>
    <div hidden={step === 'journey'}>
      {trip && <CustomerDetails active={step === 'details'} onBack={backToTrip} onComplete={details => { setCustomer(details); submissionKey.current = null; setSubmitError(''); setStep('review'); }} />}
    </div>

    <dialog ref={dialogRef} className="detail-dialog" aria-labelledby="dialog-title" onCancel={event => { if (submitting) event.preventDefault(); else setStep('details'); }} onClick={e => { if (e.target === e.currentTarget && !submitting) setStep('details'); }}>
      <div className="dialog-body"><button className="dialog-close" disabled={submitting} onClick={() => setStep('details')} aria-label="Close dialog"><X /></button>
        {trip && <><span className="summary-icon"><Check size={25} /></span><p className="eyebrow">Your journey, your way</p><h2 id="dialog-title">Let’s arrange your ride.</h2><p>Check your journey and contact details, then send your quote request to our team.</p><dl className="trip-summary">{trip.vehiclePreference && <div><dt>Vehicle preference</dt><dd>{trip.fleetName || (trip.vehiclePreference === 'sedan' ? 'Sedans' : 'Luxury SUVs')}</dd></div>}<div><dt>Service</dt><dd>{trip.service === 'hourly' ? `By the hour · ${trip.hours} hours` : { 'one-way': 'One way', return: 'Return', 'multi-trip': 'Multi-trip' }[trip.journey]}</dd></div>{trip.legs.map((leg, index) => <div className="summary-leg" key={leg.id}>{trip.legs.length > 1 && <h3>Trip {index + 1}</h3>}<div><dt>Pick-up</dt><dd>{leg.pickup}</dd></div>{leg.stops.map((stop, stopIndex) => <div key={stop.id}><dt>Stop {stopIndex + 1}</dt><dd>{stop.location}</dd></div>)}{trip.service !== 'hourly' && <div><dt>Drop-off</dt><dd>{leg.dropoff}</dd></div>}{leg.flightNumber && <div><dt>Arriving flight</dt><dd>{leg.flightNumber}</dd></div>}<div><dt>Date & time</dt><dd>{leg.flightScheduled ? 'Set by your flight (to be confirmed)' : new Date(`${leg.date}T${leg.time}`).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div><div><dt>Passengers</dt><dd>{leg.passengers}</dd></div>{Number(leg.waitingMinutes) > 0 && <div><dt>Planned waiting</dt><dd>{leg.waitingMinutes} minutes</dd></div>}</div>)}{trip.returnDate && <div><dt>Return</dt><dd>{new Date(`${trip.returnDate}T${trip.returnTime}`).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}<small className="return-route-summary">{[trip.legs[0].dropoff, ...[...trip.legs[0].stops].reverse().map(stop => stop.location), trip.legs[0].pickup].join(' / ')}</small>{Number(trip.returnWaitingMinutes) > 0 && <small className="return-route-summary">Planned waiting: {trip.returnWaitingMinutes} minutes</small>}</dd></div>}{trip.attachment && <div><dt>Flight reference</dt><dd>{trip.attachment.name} (will be attached)</dd></div>}{trip.flightText && <div><dt>Flight details</dt><dd className="flight-summary-text">{trip.flightText}</dd></div>}</dl>{trip.service === 'transfer' && <FareEstimate fare={trip.fareEstimate} total />}{customer && <><h3 className="customer-review-title">Passenger details</h3><dl className="trip-summary customer-review"><div><dt>Name</dt><dd>{customer.firstName} {customer.lastName}</dd></div><div><dt>Mobile</dt><dd>{customer.countryCode} {customer.mobile}</dd></div><div><dt>Email</dt><dd>{customer.email}</dd></div>{customer.someoneElse && <><div><dt>Booked by</dt><dd>{customer.bookerName}</dd></div><div><dt>Contact email</dt><dd>{customer.bookerEmail}</dd></div></>}{[['signName', 'Pick-up sign'], ['chauffeurNote', 'Chauffeur note'], ['reference', 'Reference'], ['voucher', 'Voucher (unverified)']].map(([key, label]) => customer[key] ? <div key={key}><dt>{label}</dt><dd className="customer-review-text">{customer[key]}</dd></div> : null)}</dl></>}{submitError && <p className="admin-error" role="alert">{submitError}</p>}<button type="button" className="gold-button send-quote-button" disabled={submitting} onClick={sendQuote}>{submitting ? 'Saving your request?' : 'Send quote request'}</button><p className="dialog-note">Sending saves your details and any attached itinerary for our team to review. Your quote is subject to availability and pricing; this does not confirm a booking.</p></>}
      </div>
    </dialog>
  </>;
}
