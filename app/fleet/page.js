import Link from 'next/link';
import { CarFront, Luggage, Users } from 'lucide-react';
import Logo from '../components/Logo';
import ManageBookingLink from '../components/ManageBookingLink';
import FleetCatalog from './FleetCatalog';
import { listFleet } from '../../lib/fleet';
import styles from '../components/ServicePage.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Our Fleet | Sedans & Luxury SUVs | Limo804',
  description: 'Explore sedan and luxury SUV categories for your Sydney airport transfer, corporate journey or special occasion. Find the right fit and request a Limo804 quote.',
};

export default async function FleetPage() {
  let vehicles = []; let unavailable = false;
  try { vehicles = await listFleet(); } catch { unavailable = true; }
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <ManageBookingLink />
      <div className={`header-inner ${styles.header}`}>
        <Logo />
        <nav aria-label="Main navigation"><Link href="/">Home</Link><Link href="/fleet" aria-current="page">Our Fleet</Link><Link href="/airport-transfers">Airport Transfers</Link><Link href="/corporate">Corporate</Link><Link href="/weddings">Weddings</Link><Link href="/contact">Contact</Link></nav>
        <Link className="gold-button" href="/quote">Get a quote</Link>
      </div>
    </header>
    <main id="main" className="fleet-page">
      <section className="fleet-page-hero"><div className="fleet-page-hero-inner"><p className="fleet-breadcrumb"><Link href="/">Home</Link><span>/</span>Our Fleet</p><p className="eyebrow">The Limo804 collection</p><h1>A refined ride.<br />For every journey.</h1><p>Discover sedans and luxury SUVs for your next<br className="desktop-break" /> arrival in Sydney. Choose your style. We’ll take it from there.</p><a className="gold-button" href="#fleet-categories">Explore the fleet</a></div></section>
      <section className="fleet-catalog section-shell" id="fleet-categories" aria-label="Our fleet categories"><FleetCatalog vehicles={vehicles} unavailable={unavailable} /></section>
      <section className="fleet-guidance section-shell" aria-labelledby="fleet-guide-heading"><div><p className="eyebrow">A thoughtful choice</p><h2 id="fleet-guide-heading">The right vehicle.<br />The right kind of journey.</h2><p>Tell us a little about your plans and we’ll help you choose a vehicle that fits.</p><Link className="fleet-consult-link" href="/quote">Plan your journey</Link></div><div className="fleet-guide-items">{[{ icon: Users, title: 'Your people', text: 'Let us know how many passengers are travelling, including children.' }, { icon: Luggage, title: 'Your luggage', text: 'Include suitcases, prams and oversized items so we can check the space you need.' }, { icon: CarFront, title: 'Your occasion', text: 'Airport transfer, meeting or celebration: share the stops and details that matter.' }].map(({ icon: Icon, title, text }) => <div key={title}><Icon size={25} strokeWidth={1.4} /><div><h3>{title}</h3><p>{text}</p></div></div>)}</div></section>
      <section className="fleet-faq section-shell" aria-labelledby="fleet-faq-heading"><div><p className="eyebrow">Before you travel</p><h2 id="fleet-faq-heading">A few helpful details.</h2></div><div>{[{ question: 'Which category should I choose?', answer: 'A sedan is a good starting point for one to three passengers with standard luggage. Consider a luxury SUV for a larger party or extra space. The team will confirm the right fit for your passenger and luggage requirements.' }, { question: 'Can I request a particular model?', answer: 'Share your preferred vehicle when enquiring. A specific make or model is subject to availability and confirmation.' }, { question: 'What if I am travelling with extra luggage or children?', answer: 'Add your luggage details and any child-seat requirements in the chauffeur notes when preparing your enquiry. Our team will discuss the available arrangements with you before confirming your booking.' }].map(item => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></section>
      <section className="contact-section"><div><p className="eyebrow">Your next arrival</p><h2>Let’s make it exceptional.</h2><p>Choose your vehicle category and tell us where you’re going.</p></div><Link className="gold-button" href="/quote">Get a quote</Link></section>
    </main>
    <footer className="footer"><Logo /><p>Chauffeur & limousine services · Sydney, Australia</p><span>© {new Date().getFullYear()} Limo804. All rights reserved.</span></footer>
  </>;
}
