import { formatAud } from '../../lib/fare';

export default function FareEstimate({ fare, total = false }) {
  return <section className={`fare-estimate${total ? ' fare-total' : ''}`} aria-label={total ? 'Total estimated price' : 'Estimated journey price'} aria-live="polite">
    <div className="fare-estimate-heading">
      <div><span>{total ? 'Total estimated price' : 'Estimated journey total'}</span>{fare?.unpricedTollJourneys > 0 && <small>Tolls to be confirmed</small>}</div>
      <strong>{fare ? `AUD ${formatAud(fare.totalCents)}${fare.unpricedTollJourneys ? ' + tolls' : ''}` : '—'}</strong>
    </div>
  </section>;
}
