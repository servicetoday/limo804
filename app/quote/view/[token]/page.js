import Link from 'next/link';
import { notFound } from 'next/navigation';
import { customerOffer } from '../../../../lib/quote-offers';
import Logo from '../../../components/Logo';
import ConfirmQuote from './ConfirmQuote';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your Quote | Limo804', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default async function CustomerQuotePage({ params }) {
  const { token } = await params;
  let quote;
  try { quote = await customerOffer(token); } catch (error) { if (error.status === 404) notFound(); throw error; }
  const expiry = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(`${quote.expiresAt.replace(' ', 'T')}Z`));
  return <><header className="site-header"><div className="header-inner quote-header"><Logo /><Link className="quote-home-link" href="/">Home</Link></div></header><main className="customer-quote-page"><div className="customer-quote-intro"><p className="eyebrow">Your Limo804 journey</p><h1>Review your quote.</h1><p>{quote.reference}</p></div><section className="customer-quote-card">{quote.isTest && <p className="customer-test-note">TEST QUOTE — dummy data. No vehicle will be dispatched.</p>}<div className="customer-price"><div><span>Your quoted total</span><strong>{quote.currency} {quote.amount}</strong></div><p>Valid until {expiry}<br />Sydney time</p></div>{['active', 'confirmed'].includes(quote.state) && <><div className="customer-quote-overview"><p><span>Passenger</span>{quote.passengerName}</p><p><span>Vehicle preference</span>{quote.vehicleName}</p>{quote.durationHours && <p><span>Duration</span>{quote.durationHours} hours</p>}</div>{quote.journeys.map(journey => <article className="customer-journey" key={journey.sequence}><h2>Journey {journey.sequence}</h2><dl><div><dt>Pick-up</dt><dd>{journey.pickup}</dd></div>{journey.stops.map((location, index) => <div key={index}><dt>Stop {index + 1}</dt><dd>{location}</dd></div>)}{journey.dropoff && <div><dt>Drop-off</dt><dd>{journey.dropoff}</dd></div>}<div><dt>Date & time</dt><dd>{journey.flightBased ? `Timing to be confirmed from flight ${journey.flight}` : `${journey.date} at ${journey.time}`}<small>{journey.timezone}</small></dd></div><div><dt>Passengers</dt><dd>{journey.passengers}</dd></div></dl></article>)}</>}<ConfirmQuote token={token} quote={quote} /></section><p className="private-link-note">This is your private quote link. Please keep it safe.</p></main></>;
}
