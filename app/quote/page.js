import Link from 'next/link';
import { Phone, ShieldCheck } from 'lucide-react';
import Logo from '../components/Logo';
import QuoteForm from './QuoteForm';
import './quote.css';
import { getFleet, listFleet } from '../../lib/fleet';

export const metadata = {
  title: 'Get a Quote | LIMO804',
  description: 'Plan your Sydney chauffeur journey. Enter your pickup, destination, date, time and passengers to prepare your quote enquiry.',
};

export default async function QuotePage({ searchParams }) {
  const params = await searchParams;
  let vehicle = ['sedan', 'suv'].includes(params?.vehicle) ? params.vehicle : '';
  let selectedFleet = null;
  let vehicles = [];
  try { vehicles = await listFleet(); } catch {}
  if (typeof params?.fleet === 'string' && /^\d+$/.test(params.fleet) && Number.isSafeInteger(Number(params.fleet))) {
    try { const record = await getFleet(Number(params.fleet)); if (record?.isActive) { selectedFleet = { id: record.id, name: record.name }; vehicle = record.category; } } catch {}
  }
  return <div className="modern-quote">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <div className="header-inner quote-header">
        <Logo />
        <Link className="quote-home-link" href="/">Back to home</Link>
        <Link className="quote-manage-link" href="/manage-booking">Manage booking</Link>
        <a className="header-phone" href="tel:0416934865"><Phone size={23} fill="currentColor" /><span>0416 934 865</span></a>
      </div>
    </header>
    <main id="main" className="quote-main booking-page">
      <div className="quote-intro">
        <p className="eyebrow">Sydney chauffeur service</p>
        <h1>Where are we taking you?</h1>
        <p>Plan your ride. We’ll take care of the rest.</p>
      </div>
      <section className="booking-workspace" aria-labelledby="trip-heading">
        <h2 id="trip-heading" className="sr-only">Plan your journey</h2>
        <QuoteForm initialVehicle={vehicle} selectedFleet={selectedFleet} vehicles={vehicles} />
        <p className="quote-help"><ShieldCheck size={16} /> Your request is reviewed by our team. No payment required.</p>
      </section>
    </main>
    <footer className="footer"><Logo /><p>Chauffeur & limousine services · Sydney, Australia</p><span>© {new Date().getFullYear()} LIMO804. All rights reserved.</span></footer>
  </div>;
}
