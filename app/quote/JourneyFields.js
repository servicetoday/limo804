import AddressInput from './AddressInput';
import JourneyMap from './JourneyMap';
import { isAirportPickup } from './booking';
import { ArrowDown, ArrowDownUp, ArrowUp, CalendarDays, ChevronDown, Clock3, Plus, X } from 'lucide-react';
import { passengerCounts } from '../../lib/passenger-count';

export default function JourneyFields({ leg, index, multiTrip, hourly, today, onChange, onRemove, canRemove, oneWay = false }) {
  const prefix = `leg-${leg.id}`;
  const airport = oneWay && isAirportPickup(leg.pickup);
  const flightScheduled = airport && !leg.flightUnknown && !leg.manualSchedule;
  const stops = leg.stops || [];
  const expanded = !multiTrip || !leg.collapsed;
  const supportsStops = !hourly;
  function addStop() {
    if (stops.length >= 3) return;
    const id = crypto.randomUUID();
    onChange({ stops: [...stops, { id, location: '' }] });
    requestAnimationFrame(() => document.getElementById(`${prefix}-stop-${id}`)?.focus());
  }
  function moveStop(index, direction) {
    const destination = index + direction;
    if (destination < 0 || destination >= stops.length) return;
    const reordered = [...stops];
    [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
    onChange({ stops: reordered });
  }
  function quickDate(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    onChange({ date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` });
  }
  return <section className={`${multiTrip ? `individual-trip ${index > 0 ? 'additional-trip' : ''}` : 'single-trip'} ${supportsStops ? 'oneway-trip' : ''}`} aria-label={`Trip ${index + 1}`}>
    {multiTrip && <div className="trip-heading">
      <h3><button type="button" id={`trip-toggle-${leg.id}`} aria-expanded={expanded} aria-controls={`${prefix}-details`} onClick={() => onChange({ collapsed: !leg.collapsed })}><span className="trip-number">{index + 1}</span><span>Trip {index + 1} · Your journey</span></button></h3>
      <span className="trip-heading-rule" />
      <button className="remove-trip-button" type="button" disabled={!canRemove} aria-label={`Remove trip ${index + 1}`} onClick={onRemove}>Remove</button>
      <button className={`collapse-trip ${expanded ? '' : 'collapsed'}`} type="button" aria-label={`${expanded ? 'Collapse' : 'Expand'} trip ${index + 1}`} aria-expanded={expanded} aria-controls={`${prefix}-details`} onClick={() => onChange({ collapsed: !leg.collapsed })}><ChevronDown size={18} /></button>
    </div>}
    <div id={`${prefix}-details`} hidden={!expanded}>
      <div className={`route-fields ${hourly ? 'hourly-route' : ''}`}>
        <div className="editable-location"><label className="location-box pickup-box"><span className="route-marker" /><span className="location-content"><span className="journey-label">Pick-up</span><AddressInput id={`${prefix}-pickup`} name={`${prefix}-pickup`} value={leg.pickup} onChange={e => onChange({ pickup: e.target.value })} required maxLength={160} placeholder={multiTrip && index > 0 ? 'Where from?' : 'Address, hotel or airport'} autoComplete="off" /></span></label>{supportsStops && leg.pickup && <button type="button" className="clear-location" aria-label="Clear pick-up" onClick={() => { onChange({ pickup: '' }); document.getElementById(`${prefix}-pickup`)?.focus(); }}><X size={16} /></button>}</div>
        {supportsStops && <div className="oneway-middle">
          {stops.map((stop, stopIndex) => <div className="editable-location stop-location" key={stop.id}>
            <label className="location-box"><span className="route-marker" /><span className="location-content"><span className="journey-label">Stop {stopIndex + 1}</span><AddressInput id={`${prefix}-stop-${stop.id}`} name={`${prefix}-stop-${stop.id}`} required value={stop.location} onChange={e => onChange({ stops: stops.map(item => item.id === stop.id ? { ...item, location: e.target.value } : item) })} placeholder="Enter a stop along the way" maxLength={160} /></span></label>
            <div className="stop-controls"><div className="stop-order"><button type="button" aria-label={`Move stop ${stopIndex + 1} up`} disabled={stopIndex === 0} onClick={() => moveStop(stopIndex, -1)}><ArrowUp size={13} /></button><button type="button" aria-label={`Move stop ${stopIndex + 1} down`} disabled={stopIndex === stops.length - 1} onClick={() => moveStop(stopIndex, 1)}><ArrowDown size={13} /></button></div><button className="remove-oneway-stop" type="button" aria-label={`Remove stop ${stopIndex + 1}`} onClick={() => { onChange({ stops: stops.filter(item => item.id !== stop.id) }); requestAnimationFrame(() => document.getElementById(`${prefix}-add-stop`)?.focus()); }}><X size={16} /></button></div>
          </div>)}
          <div className="route-tools"><button type="button" className="oneway-add-stop" id={`${prefix}-add-stop`} disabled={stops.length >= 3} onClick={addStop}><span><Plus size={14} /></span>{stops.length >= 3 ? 'Maximum 3 stops' : stops.length ? 'Add another stop' : 'Add a stop'}</button><button type="button" className="swap-locations" aria-label="Swap pick-up and drop-off" onClick={() => onChange({ pickup: leg.dropoff, dropoff: leg.pickup, stops: [...stops].reverse() })}><ArrowDownUp size={17} /></button></div>
        </div>}
        {!hourly && <div className="editable-location"><label className="location-box dropoff-box"><span className="route-marker" /><span className="location-content"><span className="journey-label">Drop-off</span><AddressInput id={`${prefix}-dropoff`} name={`${prefix}-dropoff`} value={leg.dropoff} onChange={e => onChange({ dropoff: e.target.value })} required maxLength={160} placeholder={multiTrip && index > 0 ? 'Where are you going?' : 'Enter drop-off location'} autoComplete="off" /></span></label>{supportsStops && leg.dropoff && <button type="button" className="clear-location" aria-label="Clear drop-off" onClick={() => { onChange({ dropoff: '' }); document.getElementById(`${prefix}-dropoff`)?.focus(); }}><X size={16} /></button>}</div>}
      </div>
      {!hourly && <JourneyMap pickup={leg.pickup} dropoff={leg.dropoff} stops={stops} active={expanded} title={multiTrip ? `Trip ${index + 1} route` : 'Route preview'} onRouteMetrics={routeMetrics => onChange({ routeMetrics })} waitingMinutes={leg.waitingMinutes ?? 0} onWaitingChange={waitingMinutes => onChange({ waitingMinutes })} waitingName={`${prefix}-waitingMinutes`} />}
      {airport && <div className="arriving-flight">
        <label className="schedule-box flight-number-box"><span className="journey-label">Arriving flight</span><input name={`${prefix}-flightNumber`} value={leg.flightNumber || ''} disabled={!!leg.flightUnknown} onChange={e => onChange({ flightNumber: e.target.value.toUpperCase() })} placeholder="e.g. EK412" maxLength={10} required={flightScheduled} autoComplete="off" /></label>
        <div className="flight-description"><p>Add your flight so our team can coordinate your airport pick-up.</p><label><input type="checkbox" checked={!!leg.flightUnknown} onChange={e => onChange({ flightUnknown: e.target.checked })} />I don&apos;t know it yet</label></div>
        {!leg.flightUnknown && <div className="flight-scheduling-note"><span>{flightScheduled ? 'Flight-based pick-up timing will be confirmed by our team.' : 'Choose your preferred pick-up date and time below.'}</span><button type="button" onClick={() => onChange({ manualSchedule: !leg.manualSchedule })}>{flightScheduled ? 'Set pick-up manually' : 'Use flight timing'}</button></div>}
      </div>}
      <div className="journey-schedule">
        <label className="schedule-box"><span className="journey-label">Pick-up date</span><span className="schedule-input"><input name={`${prefix}-date`} type={flightScheduled ? 'text' : 'date'} disabled={flightScheduled} placeholder="Set by your flight" value={flightScheduled ? '' : leg.date} onChange={e => onChange({ date: e.target.value })} min={today} required aria-label={`Trip ${index + 1} pick-up date`} /><CalendarDays size={17} /></span></label>
        <label className="schedule-box"><span className="journey-label">Pick-up time</span><span className="schedule-input"><input name={`${prefix}-time`} type={flightScheduled ? 'text' : 'time'} disabled={flightScheduled} placeholder="Set by your flight" value={flightScheduled ? '' : leg.time} onChange={e => onChange({ time: e.target.value })} required aria-label={`Trip ${index + 1} pick-up time`} /><Clock3 size={17} /></span></label>
        <label className="schedule-box passengers-box"><span className="journey-label">Passengers</span><select name={`${prefix}-passengers`} value={leg.passengers} required aria-label={`Number of passengers for trip ${index + 1}`} onChange={event => onChange({ passengers: Number(event.target.value) })}>{passengerCounts.map(count => <option key={count} value={count}>{count} passenger{count === 1 ? '' : 's'}</option>)}</select></label>
      </div>
      {(!multiTrip || index === 0) && !flightScheduled && <div className="quick-dates"><button type="button" onClick={() => quickDate(0)}>Today</button><button type="button" onClick={() => quickDate(1)}>Tomorrow</button></div>}
    </div>
  </section>;
}
