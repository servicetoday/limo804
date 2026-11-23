import Link from 'next/link';
import { Phone, ShieldCheck } from 'lucide-react';
import Logo from '../components/Logo';
import QuoteForm from './QuoteForm';
import ManageBookingLink from '../components/ManageBookingLink';
import { getFleet } from '../../lib/fleet';

export const metadata = {
  title: 'Get a Quote | LIMO804',
  description: 'Plan your Sydney chauffeur journey. Enter your pickup, destination, date, time and passengers to prepare your quote enquiry.',
};

export default async function QuotePage({ searchParams }) {
  const params = await searchParams;
  let vehicle = ['sedan', 'suv'].includes(params?.vehicle) ? params.vehicle : '';
  let selectedFleet = null;
  if (typeof params?.fleet === 'string' && /^\d+$/.test(params.fleet) && Number.isSafeInteger(Number(params.fleet))) {
    try { const record = await getFleet(Number(params.fleet)); if (record?.isActive) { selectedFleet = { id: record.id, name: record.name }; vehicle = record.category; } } catch {}
  }
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <ManageBookingLink />
      <div className="header-inner quote-header">
        <Logo />
        <Link className="quote-home-link" href="/">Back to home</Link>
        <a className="header-phone" href="tel:13005466804"><Phone size={23} fill="currentColor" /><span>1300 LIMO 804</span></a>
      </div>
    </header>
    <main id="main" className="quote-main booking-page">
      <div className="quote-intro">
        <p className="eyebrow">Your journey, your way</p>
        <h1>Get a quote.</h1>
        <p>Tell us where you’re going.<br />We’ll help you arrive in style.</p>
      </div>
      <section className="booking-workspace" aria-labelledby="trip-heading">
        <h2 id="trip-heading" className="sr-only">Plan your journey</h2>
        <QuoteForm initialVehicle={vehicle} selectedFleet={selectedFleet} />
        <p className="quote-help"><ShieldCheck size={19} /> Send your quote request and our team will review availability and pricing.</p>
      </section>
    </main>
    <footer className="footer"><Logo /><p>Chauffeur & limousine services · Sydney, Australia</p><span>© {new Date().getFullYear()} LIMO804. All rights reserved.</span></footer>
  </>;
}
