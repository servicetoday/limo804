import AddressInput from '../quote/AddressInput';
import { passengerCounts } from '../../lib/passenger-count';

export const terminals = ['Sydney Airport — T1 International', 'Sydney Airport — T2 Domestic', 'Sydney Airport — T3 Domestic', 'Western Sydney International Airport'];

export default function AirportJourneyFields({ leg, today, onChange }) {
  const arriving = leg.airportDirection !== 'departure';
  const airport = arriving ? leg.pickup : leg.dropoff;
  const address = arriving ? leg.dropoff : leg.pickup;
  function updateRoute(direction, terminal, location) {
    onChange({ airportDirection: direction, pickup: direction === 'arrival' ? terminal : location, dropoff: direction === 'arrival' ? location : terminal });
  }
  return <div className="airport-fields">
    <div className="journey-switch" role="group" aria-label="Airport transfer direction">
      <button type="button" className={arriving ? 'selected' : ''} aria-pressed={arriving} onClick={() => updateRoute('arrival', airport, address)}>From the airport</button>
      <button type="button" className={!arriving ? 'selected' : ''} aria-pressed={!arriving} onClick={() => updateRoute('departure', airport, address)}>To the airport</button>
    </div>
    <div className="airport-field-grid">
      <label className="schedule-box"><span className="journey-label">Airport / terminal</span><select name={`leg-0-${arriving ? 'pickup' : 'dropoff'}`} value={airport} required onChange={e => updateRoute(arriving ? 'arrival' : 'departure', e.target.value, address)}>{terminals.map(terminal => <option key={terminal}>{terminal}</option>)}</select></label>
      <label className="schedule-box"><span className="journey-label">{arriving ? 'Drop-off address' : 'Pick-up address'}</span><AddressInput id="airport-address" name={`leg-0-${arriving ? 'dropoff' : 'pickup'}`} value={address} onChange={e => updateRoute(arriving ? 'arrival' : 'departure', airport, e.target.value)} placeholder="Home, hotel or office address" required maxLength={160} /></label>
      <label className="schedule-box"><span className="journey-label">{arriving ? 'Arriving flight number' : 'Departing flight number'}</span><input name="leg-0-flightNumber" value={leg.flightNumber || ''} onChange={e => onChange({ flightNumber: e.target.value.toUpperCase() })} disabled={!!leg.flightUnknown} required={!leg.flightUnknown} pattern="[A-Za-z0-9]{2,3} ?[0-9]{1,4}[A-Za-z]?" maxLength={10} placeholder="e.g. QF12" title="Enter a flight number such as QF12 or EK412." /></label>
      <label className="airport-unknown"><input type="checkbox" checked={!!leg.flightUnknown} onChange={e => onChange({ flightUnknown: e.target.checked })} />I don&apos;t know my flight number yet</label>
      <label className="schedule-box"><span className="journey-label">Pick-up date (Sydney time)</span><input name="leg-0-date" type="date" min={today} value={leg.date} required onChange={e => onChange({ date: e.target.value })} /></label>
      <label className="schedule-box"><span className="journey-label">Pick-up time (Sydney time)</span><input name="leg-0-time" type="time" value={leg.time} required onChange={e => onChange({ time: e.target.value })} /></label>
      <label className="schedule-box"><span className="journey-label">Passengers, including children</span><select name="leg-0-passengers" value={leg.passengers} onChange={e => onChange({ passengers: Number(e.target.value) })}>{passengerCounts.map(count => <option key={count} value={count}>{count} passenger{count === 1 ? '' : 's'}</option>)}</select></label>
      <label className="schedule-box"><span className="journey-label">Suitcases</span><select name="suitcases" defaultValue="1">{Array.from({ length: 15 }, (_, count) => <option key={count} value={count}>{count} suitcase{count === 1 ? '' : 's'}</option>)}</select></label>
      <label className="schedule-box"><span className="journey-label">Carry-on bags</span><select name="carryOn" defaultValue="0">{Array.from({ length: 15 }, (_, count) => <option key={count} value={count}>{count} bag{count === 1 ? '' : 's'}</option>)}</select></label>
      <label className="schedule-box"><span className="journey-label">Child seats or oversized luggage (optional)</span><input name="airportRequirements" maxLength={500} placeholder="Child ages, pram, golf clubs…" /></label>
    </div>
    <p className="airport-timing-help">{arriving ? 'Choose your preferred pick-up time, allowing for baggage collection and immigration. Our team will confirm the meeting details.' : 'Choose your pick-up time from your address, allowing enough travel and airport check-in time.'} Flight details are reviewed by our team.</p>
  </div>;
}
