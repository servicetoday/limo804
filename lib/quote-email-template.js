const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

export function adminNotificationContent(quote, booking = false) {
  if (booking && !quote.booking) throw new Error('No booking is linked to this quote.');
  const heading = booking ? `New ${quote.booking.status} booking ${quote.booking.reference}` : `New quote request ${quote.reference}`;
  const person = quote.passenger_snapshot || {};
  const booker = quote.customer_snapshot || {};
  const lines = [heading, '', `Quote reference: ${quote.reference}`, `Passenger: ${person.displayName || ''}`, `Passenger email: ${person.email || ''}`, `Passenger phone: ${[person.countryCode, person.mobile].filter(Boolean).join(' ')}`, `Booked by: ${booker.displayName || ''}`, `Booker email: ${booker.email || ''}`];
  if (booking) lines.push(`Booking status: ${quote.booking.status}`, `Total: ${quote.booking.currency} ${quote.booking.total_amount}`);
  for (const [index, journey] of quote.journeys.entries()) {
    lines.push('', `Journey ${index + 1}${journey.leg_type === 'return' ? ' (return)' : ''}`, `Pick-up: ${journey.pickup_location}`);
    for (const stop of journey.stops) lines.push(`Stop ${stop.sequence_number}: ${stop.location}`);
    if (journey.dropoff_location) lines.push(`Drop-off: ${journey.dropoff_location}`);
    lines.push(journey.timing_source === 'flight' ? `Flight timing: ${journey.arriving_flight || 'To be confirmed'}` : `Pick-up: ${journey.pickup_local_date} at ${journey.pickup_local_time.slice(0, 5)} (Australia/Sydney)`, `Passengers: ${journey.passengers}`);
  }
  if (quote.vehicle_name_snapshot) lines.push('', `Vehicle preference: ${quote.vehicle_name_snapshot}`);
  if (quote.duration_hours) lines.push(`Duration: ${quote.duration_hours} hours`);
  if (quote.pickup_sign_name) lines.push(`Pick-up sign: ${quote.pickup_sign_name}`);
  if (quote.chauffeur_note) lines.push('', `Chauffeur notes: ${quote.chauffeur_note}`);
  if (quote.flight_itinerary) lines.push('', `Itinerary: ${quote.flight_itinerary}`);
  lines.push('', 'Open Limo804 administration to review the full details.');
  const text = lines.join('\n');
  return { subject: `Limo804 admin: ${heading}`, text, html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#18304b"><h1 style="font-size:22px">${escapeHtml(heading)}</h1><div style="font-size:14px;line-height:1.7">${lines.map(line => escapeHtml(line)).join('<br>')}</div></body></html>` };
}
export function pricedQuoteEmailContent(quote, offer) {
  const test = /^DUMMY/i.test(quote.customer_reference || '');
  const subject = `${test ? '[TEST] ' : ''}Your Limo804 quote: ${offer.currency} ${offer.amount} - ${quote.reference}`;
  const expiry = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(`${offer.expires_at.replace(' ', 'T')}Z`));
  const summary = quoteEmailContent(quote).text;
  const intro = `${test ? 'This is a test quote.\n\n' : ''}Your quoted total is ${offer.currency} ${offer.amount}.\n\nView your journey details and confirm your booking using this private link:\n${offer.url}\n\nValid until ${expiry} (Sydney time). Opening the link does not confirm a booking. Please review the details and click Confirm booking on the page. Keep this link private.\n\n`;
  const text = intro + summary;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#18304b"><div style="max-width:640px;margin:24px auto;background:white;border:1px solid #e1e6eb;border-radius:12px;overflow:hidden"><div style="background:#091420;padding:25px 30px;color:#d7af60;font-size:26px">Limo804</div><div style="padding:30px"><p>${test ? 'TEST QUOTE' : 'Your journey, your quote'}</p><h1 style="font-size:30px">${escapeHtml(offer.currency)} ${escapeHtml(offer.amount)}</h1><p>Quote reference: ${escapeHtml(quote.reference)}</p><p style="line-height:1.7">Review your journey, passengers and price, then confirm your booking on the private page.</p><a href="${escapeHtml(offer.url)}" style="display:inline-block;background:#d7af60;color:#091420;text-decoration:none;padding:15px 24px;border-radius:6px;font-weight:bold">View quote &amp; confirm booking</a><p style="font-size:12px;color:#76859b;line-height:1.7">Valid until ${escapeHtml(expiry)} (Sydney time). Keep this link private. Opening it does not confirm a booking.</p><hr style="border:0;border-top:1px solid #e4e8ed;margin:25px 0"><div style="font-size:14px;line-height:1.7">${summary.split('\n').map(line => line ? `${escapeHtml(line)}<br>` : '<br>').join('')}</div></div></div></body></html>`;
  return { subject, text, html };
}

export function bookingEmailContent(quote) {
  if (!quote.booking) throw new Error('No booking is linked to this quote.');
  const booking = quote.booking;
  const test = /^DUMMY/i.test(quote.customer_reference || '');
  const subject = `${test ? '[TEST] ' : ''}Limo804 ${booking.status} booking ${booking.reference}`;
  const lines = ['Hello,', '', ...(test ? ['This is a dummy booking email for testing only. No vehicle will be dispatched.', ''] : []), `Booking reference: ${booking.reference}`, `Quote reference: ${quote.reference}`, `Booking status: ${booking.status.toUpperCase()}`, `Total: ${booking.currency} ${booking.total_amount}`];
  if (quote.duration_hours) lines.push(`Duration: ${quote.duration_hours} hours`);
  for (const [index, journey] of quote.journeys.entries()) {
    lines.push('', `Journey ${index + 1}`, `Pick-up: ${journey.pickup_location}`);
    for (const stop of journey.stops) lines.push(`Stop ${stop.sequence_number}: ${stop.location}`);
    if (journey.dropoff_location) lines.push(`Drop-off: ${journey.dropoff_location}`);
    lines.push(journey.timing_source === 'flight' ? 'Pick-up timing: to be confirmed from your flight' : `Date and time: ${journey.pickup_local_date} at ${journey.pickup_local_time.slice(0, 5)} (Australia/Sydney)`, `Passengers: ${journey.passengers}`);
  }
  if (booking.status === 'pending') lines.push('', 'This booking is pending. It is not confirmed. Contact our team for dispatch details.');
  lines.push('', 'Please keep your booking reference for enquiries.', '', 'Kind regards,', 'Limo804');
  return { subject, text: lines.join('\n'), html: `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#18304b"><div style="max-width:640px;margin:24px auto;background:white;border:1px solid #e1e6eb;border-radius:12px;overflow:hidden"><div style="background:#091420;padding:25px 30px;color:#d7af60;font-size:26px">Limo804</div><div style="padding:30px"><h1 style="font-size:24px">${test ? 'Test booking' : 'Booking update'}: ${escapeHtml(booking.status)}</h1><div style="font-size:15px;line-height:1.75">${lines.map(line => line ? `${escapeHtml(line)}<br>` : '<br>').join('')}</div></div></div></body></html>` };
}

export function quoteEmailContent(quote) {
  const test = /^DUMMY/i.test(quote.customer_reference || '');
  const subject = `${test ? '[TEST] ' : ''}Limo804 quote request ${quote.reference}`;
  const lines = ['Hello,', '', test ? 'This is a test quote acknowledgement. No vehicle has been booked.' : 'Thank you for your quote request. We have received your journey details.', '', `Quote reference: ${quote.reference}`];
  for (const [index, journey] of quote.journeys.entries()) {
    lines.push('', `Journey ${index + 1}${journey.leg_type === 'return' ? ' (return)' : ''}`, `Pick-up: ${journey.pickup_location}`);
    for (const stop of journey.stops) lines.push(`Stop ${stop.sequence_number}: ${stop.location}`);
    if (journey.dropoff_location) lines.push(`Drop-off: ${journey.dropoff_location}`);
    lines.push(journey.timing_source === 'flight' ? `Pick-up time: to be confirmed from flight ${journey.arriving_flight}` : `Pick-up: ${journey.pickup_local_date} at ${journey.pickup_local_time.slice(0, 5)} (Australia/Sydney)`, `Passengers: ${journey.passengers}`);
  }
  if (quote.vehicle_name_snapshot || quote.preferred_category) lines.push('', `Vehicle preference: ${quote.vehicle_name_snapshot || (quote.preferred_category === 'sedan' ? 'Sedan' : 'Luxury SUV')}`);
  if (quote.duration_hours) lines.push(`Duration: ${quote.duration_hours} hours`);
  lines.push('', quote.quoted_total === null ? 'Pricing and vehicle availability are pending review.' : `Quoted total: ${quote.currency} ${quote.quoted_total}`, 'This acknowledgement does not confirm a booking.', '', 'Please keep your quote reference when contacting our team.', '', 'Kind regards,', 'Limo804');
  const text = lines.join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,sans-serif;color:#18304b"><div style="max-width:640px;margin:24px auto;background:#fff;border:1px solid #e1e6eb;border-radius:12px;overflow:hidden"><div style="background:#091420;padding:25px 30px;color:#d7af60;font-size:26px;letter-spacing:2px">Limo804</div><div style="padding:30px"><h1 style="font-size:24px;margin:0 0 20px">${test ? 'Test quote received' : 'Your quote request is received'}</h1><div style="line-height:1.75;font-size:15px">${lines.map(line => line ? `${escapeHtml(line)}<br>` : '<br>').join('')}</div></div></div></body></html>`;
  return { subject, text, html };
}
