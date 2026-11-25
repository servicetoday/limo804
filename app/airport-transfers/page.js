import Link from 'next/link';
import { ArrowRight, CarFront, Luggage, Phone, Plane, ShieldCheck, UserRound } from 'lucide-react';
import Logo from '../components/Logo';
import ManageBookingLink from '../components/ManageBookingLink';
import QuoteForm from '../quote/QuoteForm';
import '../quote/quote.css';
import './airport.css';

export const metadata = {
  title: 'Sydney Airport Transfers | LIMO804',
  description: 'Arrange a private chauffeur transfer to or from Sydney Airport or Western Sydney International Airport. Request a quote with your terminal, flight number, passengers and luggage details.',
};

export default function AirportTransfersPage() {
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <ManageBookingLink />
      <div className="header-inner airport-header">
        <Logo />
        <nav aria-label="Main navigation"><Link href="/">Home</Link><Link href="/fleet">Our Fleet</Link><Link href="/airport-transfers" aria-current="page">Airport Transfers</Link><Link href="/corporate">Corporate</Link><Link href="/weddings">Weddings</Link><Link href="/contact">Contact</Link></nav>
        <a className="header-phone" href="tel:0416934865"><Phone size={20} /><span>0416 934 865</span></a>
        <a className="gold-button" href="#airport-quote">Get a quote</a>
      </div>
    </header>
    <main id="main">
      <section className="hero landing-hero airport-hero" aria-labelledby="airport-heading">
        <div className="hero-photo" /><div className="hero-shade" />
        <div className="hero-inner"><div className="hero-copy">
          <p className="eyebrow">Sydney Airport transfers<span /></p>
          <h1 id="airport-heading">Your flight.<br />Our priority.</h1>
          <p className="hero-description">Start or finish your journey in comfort.<br className="desktop-break" /> Private transfers to or from Sydney Airport<br className="desktop-break" /> and Western Sydney International Airport.</p>
          <div className="hero-actions"><a className="gold-button ride-button" href="#airport-quote">Get an airport quote <ArrowRight size={20} /></a><Link className="fleet-link" href="/fleet">Explore our fleet <ArrowRight size={19} /></Link></div>
        </div></div>
      </section>
      <section className="benefits" aria-label="Your airport journey"><div className="benefits-inner">{[{ icon: Plane, text: '24/7 Airport Transfers' }, { icon: UserRound, text: 'Professional Chauffeurs' }, { icon: ShieldCheck, text: 'Fixed Upfront Pricing' }, { icon: CarFront, text: 'Luxury Fleet' }].map(({ icon: Icon, text }) => <div className="benefit" key={text}><Icon strokeWidth={1.35} /><span>{text}</span></div>)}</div></section>
      <section className="airport-intro section-shell" aria-labelledby="airport-travel-heading">
        <div><p className="eyebrow">A better way to travel</p><h2 id="airport-travel-heading">A smooth transfer.<br />At either end of your flight.</h2><p>Relax and enjoy a private chauffeur journey between your home, hotel or office and Sydney Airport or Western Sydney International Airport. From an early departure to your arrival home, make every journey feel like part of the occasion.</p></div>
        <div className="airport-service-details">
          <article><Plane size={24} /><div><h3>Arrivals &amp; departures</h3><p>Choose Sydney Airport T1 International, T2 Domestic, T3 Domestic or Western Sydney International Airport, and share your flight number so our team can plan your transfer.</p></div></article>
          <article><Luggage size={24} /><div><h3>Room for your journey</h3><p>Tell us about your passengers, suitcases, child seats and oversized items so we can confirm a suitable vehicle.</p></div></article>
          <article><UserRound size={24} /><div><h3>Every detail, taken care of</h3><p>Our team reviews your request and confirms the price, vehicle availability and pick-up arrangements with you.</p></div></article>
        </div>
      </section>
      <section id="airport-quote" className="modern-quote airport-quote-section" aria-labelledby="airport-quote-heading">
        <div className="booking-page"><div className="quote-intro"><p className="eyebrow">Let’s arrange your airport ride</p><h2 id="airport-quote-heading">Get your airport transfer quote.</h2><p>Share your travel details. We’ll take care of the rest.</p></div>
          <div className="booking-workspace"><QuoteForm airportOnly /><p className="quote-help"><ShieldCheck size={16} />Your request is reviewed by our team. No payment required.</p></div>
        </div>
      </section>
      <section className="contact-section"><div><p className="eyebrow">Every detail. Taken care of.</p><h2>Prefer to talk through your transfer?</h2><p>Call our team to discuss your flight and travel needs.</p></div><a href="tel:0416934865" className="gold-button"><Phone size={20} />0416 934 865</a></section>
    </main>
    <footer className="footer"><Logo /><p>Chauffeur &amp; limousine services · Sydney, Australia</p><span>© {new Date().getFullYear()} LIMO804. All rights reserved.</span></footer>
  </>;
}
