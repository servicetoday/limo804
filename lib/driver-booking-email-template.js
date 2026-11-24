const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

export function driverUnassignedEmailContent(booking, driverName, quote) {
  const test = /^DUMMY/i.test(quote.customer_reference || '');
  const lines = [
    `Hello ${driverName},`, '',
    ...(test ? ['TEST NOTIFICATION: dummy booking only.', ''] : []),
    `You have been unassigned from booking ${booking.reference}.`,
    'Please do not attend or carry out any journeys for this booking.',
    'This notice removes your driver assignment; it does not cancel the customer’s booking.',
    '', 'Contact Limo804 dispatch if you have any questions.',
  ];
  return {
    subject: `${test ? '[TEST] ' : ''}Unassigned from Limo804 booking ${booking.reference}`,
    text: lines.join('\n'),
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#18304b"><h1>Limo804 driver unassignment</h1>${lines.map(line => `${escapeHtml(line)}<br>`).join('')}</body></html>`,
  };
}

export function driverBookingEmailContent(booking, driver, vehicle, quote) {
  const test = /^DUMMY/i.test(quote.customer_reference || '');
  const lines = [
    `Hello ${driver.name},`, '',
    ...(test ? ['TEST BOOKING: dummy data only. Do not dispatch.', ''] : []),
    `You have been assigned booking ${booking.reference}.`,
    `Booking status: ${booking.status.toUpperCase()}`,
    `Booking amount: ${booking.currency} ${Number(booking.total_amount).toFixed(2)}`,
    `Vehicle: ${vehicle?.name || 'Not selected'}`,
    `Passenger: ${quote.passenger_snapshot.displayName}`,
    `Passenger phone: ${[quote.passenger_snapshot.countryCode, quote.passenger_snapshot.mobile].filter(Boolean).join(' ') || 'Not provided'}`,
  ];
  for (const [index, journey] of quote.journeys.entries()) {
    lines.push('', `Journey ${index + 1}`, `Pick-up: ${journey.pickup_location}`);
    for (const stop of journey.stops) lines.push(`Stop ${stop.sequence_number}: ${stop.location}`);
    if (journey.dropoff_location) lines.push(`Drop-off: ${journey.dropoff_location}`);
    lines.push(journey.timing_source === 'flight' ? `Pick-up time: to be confirmed from flight ${journey.arriving_flight}` : `Pick-up: ${journey.pickup_local_date} at ${journey.pickup_local_time.slice(0, 5)} (${journey.timezone})`, `Passengers: ${journey.passengers}`);
    if (journey.arriving_flight && journey.timing_source !== 'flight') lines.push(`Arriving flight: ${journey.arriving_flight}`);
  }
  if (quote.duration_hours) lines.push(`Duration: ${quote.duration_hours} hours`);
  if (quote.pickup_sign_name) lines.push(`Pick-up sign: ${quote.pickup_sign_name}`);
  if (quote.chauffeur_note) lines.push(`Chauffeur notes: ${quote.chauffeur_note}`);
  if (booking.status === 'pending') lines.push('', 'This booking is pending confirmation. Contact dispatch before proceeding.');
  lines.push('', 'Contact Limo804 dispatch if you have any questions.');
  return {
    subject: `${test ? '[TEST] ' : ''}Your Limo804 booking assignment - ${booking.reference}`,
    text: lines.join('\n'),
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#18304b"><h1>Limo804 booking assignment</h1>${lines.map(line => `${escapeHtml(line)}<br>`).join('')}</body></html>`,
  };
}
