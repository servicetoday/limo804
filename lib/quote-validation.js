export class QuoteError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const fail = message => { throw new QuoteError(message); };
function object(value, label) { if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} is required.`); return value; }
function text(value, label, max, required = false) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string') fail(`${label} must be text.`);
  value = value.trim();
  if ((required && !value) || value.length > max) fail(`${label} ${!value ? 'is required' : `must be under ${max + 1} characters`}.`);
  return value;
}
function integer(value, label, min, max) {
  if (value === '' || value === null || typeof value === 'boolean' || !Number.isInteger(Number(value)) || Number(value) < min || Number(value) > max) fail(`${label} must be between ${min} and ${max}.`);
  return Number(value);
}
const sydneyFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export function sydneyPickup(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !/^\d{2}:\d{2}$/.test(time || '')) fail('Choose a valid pick-up date and time.');
  const [year, month, day] = date.split('-').map(Number); const [hour, minute] = time.split(':').map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  for (const offset of [660, 600]) {
    const candidate = new Date(naive - offset * 60000);
    const parts = Object.fromEntries(sydneyFormatter.formatToParts(candidate).map(part => [part.type, part.value]));
    if (`${parts.year}-${parts.month}-${parts.day}` === date && `${parts.hour}:${parts.minute}` === time) return candidate;
  }
  fail('This date/time does not exist in Sydney. Choose another time.');
}
function contact(raw) {
  object(raw, 'Customer details');
  const firstName = text(raw.firstName, 'First name', 100, true);
  const lastName = text(raw.lastName, 'Last name', 100, true);
  const email = text(raw.email, 'Email', 254, true).toLowerCase();
  const countryCode = text(raw.countryCode, 'Country code', 5, true);
  const mobile = text(raw.mobile, 'Mobile', 30, true);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Enter a valid email address.');
  if (!/^\+\d{1,3}$/.test(countryCode) || !/^[\d\s()+.-]+$/.test(mobile) || mobile.replace(/\D/g, '').length < 6 || mobile.replace(/\D/g, '').length > 14) fail('Enter a valid country code and mobile number.');
  if (raw.someoneElse !== undefined && typeof raw.someoneElse !== 'boolean') fail('Invalid booking-for-someone-else option.');
  const passenger = { firstName, lastName, displayName: `${firstName} ${lastName}`, email, countryCode, mobile };
  let booker = passenger;
  if (raw.someoneElse) {
    const displayName = text(raw.bookerName, 'Booker name', 100, true);
    const bookerEmail = text(raw.bookerEmail, 'Booker email', 254, true).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookerEmail)) fail('Enter a valid booker email.');
    booker = { firstName: '', lastName: '', displayName, email: bookerEmail, countryCode: null, mobile: null };
  }
  return { passenger, booker, someoneElse: !!raw.someoneElse, signName: text(raw.signName, 'Pick-up sign', 100), chauffeurNote: text(raw.chauffeurNote, 'Chauffeur note', 1000), reference: text(raw.reference, 'Customer reference', 100), voucher: text(raw.voucher, 'Voucher', 100) };
}
export function validateQuote(raw, now = new Date()) {
  object(raw, 'Quote');
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(raw.submissionKey || '')) fail('A valid submission key is required. Please refresh and try again.');
  const trip = object(raw.trip, 'Trip');
  if (!['transfer', 'hourly'].includes(trip.service)) fail('Choose transfer or hourly service.');
  if (!['one-way', 'return', 'multi-trip'].includes(trip.journey)) fail('Choose a valid journey type.');
  const service = trip.service; const journey = service === 'hourly' ? 'one-way' : trip.journey;
  if (!Array.isArray(trip.legs) || trip.legs.length < 1 || trip.legs.length > 8 || (journey !== 'multi-trip' && trip.legs.length !== 1)) fail('Choose between one and eight journeys.');
  const legs = trip.legs.map((item, index) => {
    object(item, 'Journey');
    const pickup = text(item.pickup, 'Pick-up location', 300, true);
    const dropoff = service === 'hourly' ? null : text(item.dropoff, 'Drop-off location', 300, true);
    if (dropoff && pickup.toLowerCase() === dropoff.toLowerCase()) fail('Pick-up and drop-off must be different.');
    const passengers = integer(item.passengers, 'Passengers', 1, 7);
    if (item.stops !== undefined && !Array.isArray(item.stops)) fail('Invalid stops.');
    const stops = (item.stops || []).map(stop => text(object(stop, 'Stop').location, 'Stop location', 300, true));
    if (stops.length > 3 || (stops.length && (service !== 'transfer' || journey !== 'one-way'))) fail('Up to three stops are supported on one-way transfers.');
    const route = [pickup, ...stops, ...(dropoff ? [dropoff] : [])];
    for (let i = 1; i < route.length; i++) if (route[i].toLowerCase() === route[i - 1].toLowerCase()) fail('Adjacent route locations must be different.');
    const flightScheduled = item.flightScheduled === true;
    const flightUnknown = item.flightUnknown === true;
    const flightNumber = text(item.flightNumber, 'Flight number', 10).toUpperCase().replace(/\s/g, '');
    if (flightScheduled && (service !== 'transfer' || journey !== 'one-way' || !/\b(airport|syd|international terminal|domestic terminal)\b/i.test(pickup) || flightUnknown || !/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(flightNumber))) fail('Add a valid arriving flight, or select manual pick-up timing.');
    if (flightNumber && !/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(flightNumber)) fail('Enter a valid flight number, for example EK412.');
    const date = flightScheduled ? null : text(item.date, 'Pick-up date', 10, true);
    const time = flightScheduled ? null : text(item.time, 'Pick-up time', 5, true);
    const utc = flightScheduled ? null : sydneyPickup(date, time);
    if (utc && utc <= now) fail('Pick-up must be in the future (Sydney time).');
    return { pickup, dropoff, passengers, stops, flightNumber, flightUnknown, flightScheduled, date, time, utc: utc?.toISOString().slice(0, 19).replace('T', ' ') || null, legType: index === 0 ? 'outbound' : 'additional' };
  });
  if (journey === 'return') {
    const date = text(trip.returnDate, 'Return date', 10, true); const time = text(trip.returnTime, 'Return time', 5, true);
    const returning = sydneyPickup(date, time);
    if (returning <= sydneyPickup(legs[0].date, legs[0].time)) fail('Return pick-up must be after the outbound journey.');
    legs.push({ ...legs[0], pickup: legs[0].dropoff, dropoff: legs[0].pickup, stops: [], date, time, utc: returning.toISOString().slice(0, 19).replace('T', ' '), legType: 'return', flightNumber: '', flightUnknown: false });
  }
  const category = text(trip.vehiclePreference, 'Vehicle category', 10);
  if (category && !['sedan', 'suv'].includes(category)) fail('Invalid vehicle category.');
  const fleetId = trip.fleetId ? integer(trip.fleetId, 'Vehicle ID', 1, 4294967295) : null;
  return { submissionKey: raw.submissionKey, service, journey, legs, category: category || null, fleetId, hours: service === 'hourly' ? integer(trip.hours, 'Duration', 2, 12) : null, customer: contact(raw.customer), flightText: text(trip.flightText, 'Flight itinerary', 3000) };
}

export const statusTransitions = { submitted: ['submitted', 'quoted', 'declined'], quoted: ['quoted', 'accepted', 'declined', 'expired'], accepted: ['accepted', 'quoted', 'declined'], declined: ['declined', 'submitted'], expired: ['expired', 'quoted'], converted: [] };
export function validateQuoteUpdate(input, current) {
  object(input, 'Quote update');
  if (!statusTransitions[current.status]?.includes(input.status)) throw new QuoteError('This quote status change is not allowed.', 409);
  let amount = current.quoted_total;
  if (input.quotedTotal !== undefined) {
    if (input.quotedTotal === null || input.quotedTotal === '') amount = null;
    else {
      if (!/^\d{1,8}(\.\d{1,2})?$/.test(String(input.quotedTotal))) fail('Enter a valid AUD amount with up to two decimal places.');
      amount = Number(input.quotedTotal).toFixed(2);
    }
  }
  if (['quoted', 'accepted'].includes(input.status) && amount === null) fail('Set a quote total before quoting or accepting.');
  if (current.status === 'accepted' && input.status !== 'quoted' && String(amount) !== String(current.quoted_total)) throw new QuoteError('Return the quote to Quoted before changing an accepted price.', 409);
  return { status: input.status, amount, note: text(input.note, 'Status note', 1000) };
}
