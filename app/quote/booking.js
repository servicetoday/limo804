export function isAirportPickup(location) {
  return /\b(airport|syd|international terminal|domestic terminal)\b/i.test(location);
}

export function validateJourneys(legs, { hourly = false, returnDate = null, returnTime = '', now = new Date() } = {}) {
  const error = (leg, field, message) => ({ id: leg.id, field, message });
  for (const leg of legs) {
    if (!hourly && leg.waitingMinutes !== undefined && (leg.waitingMinutes === '' || !Number.isInteger(Number(leg.waitingMinutes)) || Number(leg.waitingMinutes) < 0 || Number(leg.waitingMinutes) > 1440)) return error(leg, 'waitingMinutes', 'Enter waiting time between 0 and 1440 whole minutes.');
    if (!leg.pickup.trim()) return error(leg, 'pickup', 'Please enter a pick-up location.');
    if (!hourly && !leg.dropoff.trim()) return error(leg, 'dropoff', 'Please enter a drop-off location.');
    if (!hourly && leg.pickup.trim().toLowerCase() === leg.dropoff.trim().toLowerCase()) return error(leg, 'dropoff', 'Choose a different drop-off location.');
    let previousLocation = leg.pickup.trim().toLowerCase();
    for (const stop of leg.stops || []) {
      if (!stop.location.trim()) return error(leg, `stop-${stop.id}`, 'Please enter a stop location.');
      if (stop.location.trim().toLowerCase() === previousLocation) return error(leg, `stop-${stop.id}`, 'Choose a stop different from the previous location.');
      previousLocation = stop.location.trim().toLowerCase();
    }
    if (leg.stops?.length && previousLocation === leg.dropoff.trim().toLowerCase()) return error(leg, 'dropoff', 'Choose a drop-off different from your last stop.');
    if (leg.flightScheduled) {
      if (!/^[A-Z0-9]{2,3}\s?\d{1,4}[A-Z]?$/i.test((leg.flightNumber || '').trim())) return error(leg, 'flightNumber', 'Enter a flight number such as EK412, or choose “I don’t know it yet”.');
      continue;
    }
    if (!leg.date) return error(leg, 'date', 'Please choose a pick-up date.');
    if (!leg.time) return error(leg, 'time', 'Please choose a pick-up time.');
    const departure = new Date(`${leg.date}T${leg.time}`);
    if (!Number.isFinite(departure.getTime()) || departure <= now) return error(leg, 'time', 'Please choose a future pick-up date and time.');
  }
  if (returnDate !== null) {
    if (!returnDate) return error(legs[0], 'returnDate', 'Please choose a return date.');
    if (!returnTime) return error(legs[0], 'returnTime', 'Please choose a return time.');
    const departure = new Date(`${legs[0].date}T${legs[0].time}`);
    const returning = new Date(`${returnDate}T${returnTime}`);
    if (!Number.isFinite(returning.getTime()) || returning <= departure) return error(legs[0], 'returnTime', 'Your return must be after your outbound pick-up.');
  }
  return null;
}
