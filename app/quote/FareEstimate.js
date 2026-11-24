import { FARE_RULES, formatAud } from '../../lib/fare';

export default function FareEstimate({ fare, total = false }) {
  return <section className={`fare-estimate${total ? ' fare-total' : ''}`} aria-label={total ? 'Total estimated price' : 'Estimated journey price'} aria-live="polite">
    <div className="fare-estimate-heading"><div><span>{total ? 'Total estimated price' : 'Estimated fare'}</span><small>{fare?.unpricedTollJourneys ? 'Including GST; unpriced tolls extra' : 'Including 10% GST and estimated tolls'}</small></div><strong>{fare ? `AUD ${formatAud(fare.totalCents)}${fare.unpricedTollJourneys ? ' + tolls' : ''}` : '—'}</strong></div>
    {fare ? <>
      <details className="fare-breakdown"><summary>Price breakdown</summary><dl>
        {!total && <><div><dt>{(fare.distanceMeters / 1000).toLocaleString('en-AU', { maximumFractionDigits: 2 })} km × {formatAud(FARE_RULES.perKmCents)}</dt><dd>{formatAud(fare.distanceCents)}</dd></div><div><dt>{(fare.durationMillis / 60000).toLocaleString('en-AU', { maximumFractionDigits: 2 })} driving min × $0.75</dt><dd>{formatAud(fare.drivingCents)}</dd></div>{fare.minimumAdjustmentCents > 0 && <div><dt>Minimum fare adjustment</dt><dd>{formatAud(fare.minimumAdjustmentCents)}</dd></div>}<div><dt>{fare.billableWaitingMinutes} extra waiting min × $0.75</dt><dd>{formatAud(fare.waitingCents)}</dd></div></>}
        <div><dt>Estimated tolls (before GST)</dt><dd>{fare.unpricedTollJourneys ? 'To be confirmed' : formatAud(fare.tollNetCents)}</dd></div>
        {fare.roundingAdjustmentCents > 0 && <div><dt>Round-up adjustment (before GST)</dt><dd>{formatAud(fare.roundingNetCents)}</dd></div>}
        <div><dt>Subtotal before GST{fare.unpricedTollJourneys ? ' (unpriced tolls excluded)' : ''}</dt><dd>{formatAud(fare.subtotalCents)}</dd></div><div><dt>GST (10%)</dt><dd>{formatAud(fare.gstCents)}</dd></div><div className="fare-breakdown-total"><dt>Total including GST{fare.unpricedTollJourneys ? ', plus tolls' : ''}</dt><dd>{formatAud(fare.totalCents)}</dd></div>
      </dl></details>
    </> : <p className="fare-note">Complete every route and enter valid waiting minutes to see your price. If a route is unavailable, our team can provide a quote.</p>}
    {fare && <p className="fare-note fare-toll-note">{fare.unpricedTollJourneys ? 'Toll pricing is unavailable for part of this route. Unpriced tolls are excluded and will be confirmed by our team.' : fare.tollCents > 0 ? `Estimated tolls included: AUD ${formatAud(fare.tollCents)} including GST.` : 'No toll charges reported for the mapped route.'}</p>}
    <p className="fare-note">{formatAud(FARE_RULES.perKmCents)}/km + $0.75/driving min, plus 10% GST. {total ? '$80 minimum per journey including GST. ' : '$80 minimum including GST. '}First 30 minutes of waiting free; extra waiting is added at $0.75/min plus GST.</p>
    <p className="fare-note">Each journey total is rounded up to the next $5 after GST and tolls.</p>
    {total && <p className="fare-note">Estimate based on the mapped route. Final quote confirmed by our team.</p>}
  </section>;
}
