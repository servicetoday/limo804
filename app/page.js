'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Logo from './components/Logo';
import ManageBookingLink from './components/ManageBookingLink';
import { ArrowRight, Diamond, Menu, Phone, Plane, ShieldCheck, Users, UserRound, X, Luggage, CarFront } from 'lucide-react';

const services = [
  { id: 'airport', title: 'Airport Transfers', image: '/images/airport.jpg', alt: 'Aircraft in flight at sunset', description: 'Relax and enjoy a smooth transfer\nto or from Sydney Airport.', detail: 'Start or finish your journey in comfort. Arrange a private transfer between Sydney Airport and your home, hotel or office. Share your flight number when requesting your booking so your chauffeur can plan your arrival.' },
  { id: 'corporate', title: 'Corporate Chauffeur', image: '/images/sydney.jpg', alt: 'Sydney Harbour and Opera House', description: 'Travel in comfort and arrive on time\nfor your business commitments.', detail: 'Make room for what matters. From a single meeting to a full day of appointments, discuss a chauffeur itinerary tailored to your business travel across Sydney.' },
  { id: 'weddings', title: 'Special Occasions', image: '/images/wedding.jpg', alt: 'Elegant wedding flowers and celebration setting', description: 'Make your event unforgettable\nwith luxury transport.', detail: 'A beautiful arrival for a memorable day. Plan transport for weddings, anniversaries, celebrations or a special evening out. Tell us about your occasion, your party size and the little details that matter.' },
];
const benefits = [{ icon: Plane, text: '24/7 Airport Transfers' }, { icon: UserRound, text: 'Professional Chauffeurs' }, { icon: ShieldCheck, text: 'Fixed Upfront Pricing' }, { icon: Diamond, text: 'Luxury Fleet' }];



export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeService, setActiveService] = useState(null);
  const dialogRef = useRef(null);
  const lastFocus = useRef(null);

  useEffect(() => {
    if (activeService) {
      lastFocus.current = document.activeElement;
      dialogRef.current?.showModal();
      document.body.style.overflow = 'hidden';
    } else {
      dialogRef.current?.close();
      document.body.style.overflow = '';
      lastFocus.current?.focus();
    }
    return () => { document.body.style.overflow = ''; };
  }, [activeService]);

  function closeDialog() { setActiveService(null); }

  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header" id="home">
      <ManageBookingLink />
      <div className="header-inner">
        <Logo />
        <nav aria-label="Main navigation" className={menuOpen ? 'navigation is-open' : 'navigation'}>
          <a className="active" href="#home" onClick={() => setMenuOpen(false)}>Home</a>
          <Link href="/fleet" onClick={() => setMenuOpen(false)}>Our Fleet</Link>
          <button onClick={() => { setMenuOpen(false); setActiveService(services[0]); }}>Airport Transfers</button>
          <button onClick={() => { setMenuOpen(false); setActiveService(services[1]); }}>Corporate</button>
          <button onClick={() => { setMenuOpen(false); setActiveService(services[2]); }}>Weddings</button>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
        </nav>
        <a className="header-phone" href="tel:13005466804"><Phone size={23} fill="currentColor" /><span>1300 LIMO 804</span></a>
        <Link className="gold-button header-book" href="/quote">Book now</Link>
        <button className="menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
      </div>
    </header>

    <main id="main">
      <section className="hero landing-hero" aria-labelledby="hero-heading">
        <div className="hero-photo" />
        <div className="hero-shade" />
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">Sydney chauffeur & limousine service<span /></p>
            <h1 id="hero-heading">Arrive in Style.<br />Every Time.</h1>
            <p className="hero-description">Premium airport transfers, corporate travel<br className="desktop-break" /> and private chauffeur services across Sydney.</p>
            <div className="hero-actions"><Link className="gold-button ride-button" href="/quote">Get a quote <ArrowRight size={21} /></Link><Link className="fleet-link" href="/fleet">Explore our fleet <ArrowRight size={19} /></Link></div>
          </div>


        </div>
      </section>

      <section className="benefits" aria-label="The LIMO804 experience"><div className="benefits-inner">{benefits.map(({ icon: Icon, text }) => <div className="benefit" key={text}><Icon strokeWidth={1.35} /><span>{text}</span></div>)}</div></section>

      <section className="services section-shell" id="services" aria-labelledby="services-heading">
        <div className="section-title"><span /><h2 id="services-heading">A Better Way to Travel</h2><span /></div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">{services.map(service => <button key={service.id} className="service-card group text-left" onClick={() => setActiveService(service)}><div className="service-image"><img src={service.image} alt={service.alt} className="transition-transform duration-700 group-hover:scale-105" /></div><div className="service-content"><h3>{service.title}</h3><p>{service.description}</p><ArrowRight className="service-arrow transition-transform group-hover:translate-x-1" size={25} /></div></button>)}</div>
      </section>

      <section id="fleet" className="fleet-section section-shell">
        <div className="fleet-image"><img src="/images/hero-mercedes.jpg" alt="Mercedes-Benz exterior with refined metallic detailing" loading="lazy" /><span className="image-caption">Exceptional journeys begin here.</span></div>
        <div className="fleet-copy"><p className="eyebrow">The journey is yours</p><h2>A little luxury.<br />A world of difference.</h2><p>From an early airport departure to an evening worth celebrating, make every journey feel like part of the occasion.</p><div className="fleet-options"><span><CarFront size={20} /> Premium sedans</span><span><Users size={20} /> Group travel</span><span><Luggage size={20} /> Airport journeys</span></div><p className="fleet-note">Ask about available vehicles and luggage capacity when booking.</p><Link className="gold-button" href="/quote" onClick={closeDialog}>Plan your journey <ArrowRight size={19} /></Link></div>
      </section>
      <section id="contact" className="contact-section"><div><p className="eyebrow">Every detail. Taken care of.</p><h2>Your next journey starts here.</h2><p>Airport transfer, business meeting or special occasion.<br />Let’s make your arrival exceptional.</p></div><a href="tel:13005466804" className="gold-button"><Phone size={20} /> 1300 LIMO 804</a></section>
    </main>
    <footer className="footer"><Logo /><p>Chauffeur & limousine services · Sydney, Australia</p><span>© {new Date().getFullYear()} LIMO804. All rights reserved.</span></footer>

    <dialog ref={dialogRef} className="detail-dialog" aria-labelledby="dialog-title" onCancel={closeDialog} onClick={e => { if (e.target === e.currentTarget) closeDialog(); }}>
      <div className="dialog-body"><button className="dialog-close" onClick={closeDialog} aria-label="Close dialog"><X /></button>
        {activeService && <><img className="dialog-image" src={activeService.image} alt={activeService.alt} /><p className="eyebrow">Travel with LIMO804</p><h2 id="dialog-title">{activeService.title}</h2><p>{activeService.detail}</p><Link className="gold-button" href="/quote" onClick={closeDialog}>Plan your journey <ArrowRight size={19} /></Link></>}

      </div>
    </dialog>
  </>;
}
