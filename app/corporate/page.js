import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness, CalendarClock, CarFront, MapPin, Phone, Plane, Users, UserRound } from 'lucide-react';
import Logo from '../components/Logo';
import ManageBookingLink from '../components/ManageBookingLink';
import styles from '../components/ServicePage.module.css';

export const metadata = {
  title: 'Corporate Chauffeur Sydney | LIMO804',
  description: 'Plan executive transfers, client transport and business itineraries across Sydney. Discover the difference between a corporate chauffeur and a standard driving service.',
};

const differences = [
  ['Planning', 'Usually arranged around a single pick-up and destination.', 'Planned around your business itinerary, meeting times and passenger requirements.'],
  ['Service approach', 'The main focus is transporting you to your destination.', 'Adds attention to presentation, passenger comfort and the details of your arrival.'],
  ['Vehicle choice', 'Vehicle type and presentation depend on the service booked.', 'A premium vehicle preference can be discussed in advance, subject to availability and capacity.'],
  ['Multiple appointments', 'Separate rides may need to be arranged for each journey.', 'Multiple stops, individual trips or an hourly itinerary can be discussed together.'],
  ['Guests and colleagues', 'Passengers generally manage the details of their own ride.', 'A coordinator can book for someone else and share passenger contacts, pick-up sign details and instructions.'],
  ['Pricing', 'The fare structure depends on the provider and booking type.', 'Your itinerary is reviewed and a quote is provided for the agreed journey.'],
];

const occasions = [
  { icon: BriefcaseBusiness, title: 'Meetings & executive travel', text: 'Travel between offices, hotels and meeting venues with an itinerary built around your working day.' },
  { icon: Users, title: 'Clients & visiting colleagues', text: 'Arrange a considered welcome for business guests. Share passenger names, meeting points and any instructions when booking.' },
  { icon: Plane, title: 'Business airport transfers', text: 'Connect your flight with your next commitment. Request transfers to or from Sydney Airport and Western Sydney International Airport.' },
  { icon: CalendarClock, title: 'Conferences & events', text: 'Discuss transport for delegates, speakers and small groups, including staggered arrivals and multiple destinations.' },
];

export default function CorporatePage() {
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <ManageBookingLink />
      <div className={`header-inner ${styles.header}`}>
        <Logo />
        <nav aria-label="Main navigation"><Link href="/">Home</Link><Link href="/fleet">Our Fleet</Link><Link href="/airport-transfers">Airport Transfers</Link><Link href="/corporate" aria-current="page">Corporate</Link><Link href="/weddings">Weddings</Link><Link href="/contact">Contact</Link></nav>
        <Link className="gold-button" href="/quote">Get a quote</Link>
      </div>
    </header>
    <main id="main" className={styles.main}>
      <section className={`hero landing-hero ${styles.hero}`} aria-labelledby="corporate-heading">
        <div className={`hero-photo ${styles.photo}`} /><div className={`hero-shade ${styles.shade}`} />
        <div className="hero-inner"><div className="hero-copy">
          <p className="eyebrow">Sydney corporate chauffeur service<span /></p>
          <h1 id="corporate-heading">Your business.<br />A better journey.</h1>
          <p className="hero-description">From a single meeting to a full day of appointments,<br className="desktop-break" /> make room for what matters with private<br className="desktop-break" /> chauffeur travel across Sydney.</p>
          <div className="hero-actions"><Link className="gold-button ride-button" href="/quote">Plan your business travel <ArrowRight size={20} /></Link><a className="fleet-link" href="#chauffeur-difference">The chauffeur difference <ArrowRight size={19} /></a></div>
        </div></div>
      </section>

      <section className="benefits" aria-label="Corporate travel with LIMO804"><div className="benefits-inner">{[{ icon: UserRound, text: 'Professional Chauffeurs' }, { icon: CarFront, text: 'Luxury Fleet' }, { icon: MapPin, text: 'Sydney Business Travel' }, { icon: CalendarClock, text: 'Tailored Itineraries' }].map(({ icon: Icon, text }) => <div className="benefit" key={text}><Icon strokeWidth={1.35} /><span>{text}</span></div>)}</div></section>

      <section className={`section-shell ${styles.intro}`} aria-labelledby="corporate-intro">
        <div><p className="eyebrow">A better way to travel</p><h2 id="corporate-intro">Arrive prepared.<br />Make the right impression.</h2></div>
        <div><p>Business travel involves more than getting from one address to another. Meeting times, visiting clients, luggage and the order of your appointments all shape the journey.</p><p>A corporate chauffeur service brings those details into the plan. Share your schedule with LIMO804 so our team can discuss a vehicle and itinerary suited to your day, whether you are travelling yourself or arranging transport for a guest.</p></div>
      </section>

      <section id="chauffeur-difference" className={styles.comparison} aria-labelledby="difference-heading">
        <div className="section-shell">
          <p className="eyebrow">The chauffeur difference</p><h2 id="difference-heading">Corporate chauffeur or standard driver?</h2>
          <p className={styles.lead}>Both get you where you need to go. The difference is usually the level of advance planning, personal service and coordination around your business commitments.</p>
          <div className={styles.tableScroll} role="region" aria-label="Comparison of driving services" tabIndex={0}>
            <table><caption>A practical guide to choosing your business transport</caption><thead><tr><th scope="col">What matters</th><th scope="col">Standard driving service</th><th scope="col">Corporate chauffeur service</th></tr></thead><tbody>{differences.map(([label, standard, chauffeur]) => <tr key={label}><th scope="row">{label}</th><td>{standard}</td><td>{chauffeur}</td></tr>)}</tbody></table>
          </div>
          <p className={styles.note}>Services vary by provider. Confirm your vehicle, itinerary, inclusions and any waiting or additional charges before booking.</p>
        </div>
      </section>

      <section className={`section-shell ${styles.occasions}`} aria-labelledby="occasions-heading">
        <p className="eyebrow">For the way you work</p><h2 id="occasions-heading">One meeting. A full business day.<br />Or a welcome worth planning.</h2>
        <div className={styles.cards}>{occasions.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={27} strokeWidth={1.4} /><h3>{title}</h3><p>{text}</p>{title === 'Business airport transfers' && <Link href="/airport-transfers">Explore airport transfers <ArrowRight size={16} /></Link>}</article>)}</div>
      </section>

      <section className={styles.planning} aria-labelledby="planning-heading"><div className={`section-shell ${styles.planningInner}`}>
        <div><p className="eyebrow">Every detail. Taken care of.</p><h2 id="planning-heading">Tell us about your day.</h2><p>Request a transfer, add multiple trips or choose an hourly service in our journey planner. Our team will review the details and confirm availability and pricing.</p><Link className="gold-button" href="/quote">Get a corporate travel quote <ArrowRight size={18} /></Link></div>
        <ol className={styles.steps}>
          <li><span>01</span><div><h3>Share your itinerary</h3><p>Include pick-up addresses, destinations, dates and preferred times. Let us know about fixed meeting or flight times.</p></div></li>
          <li><span>02</span><div><h3>Add your passengers and preferences</h3><p>Tell us who is travelling, luggage needs, vehicle preferences and whether you are booking on behalf of someone else.</p></div></li>
          <li><span>03</span><div><h3>Review the arrangements</h3><p>Our team reviews your request. Confirm the quote and booking details before travelling; a quote request alone is not a confirmed booking.</p></div></li>
        </ol>
      </div></section>

      <section className={`section-shell ${styles.faq}`} aria-labelledby="faq-heading">
        <div><p className="eyebrow">A few useful details</p><h2 id="faq-heading">Corporate travel questions.</h2></div>
        <div>
          <details><summary>When is a corporate chauffeur a good fit?</summary><p>Consider a chauffeur when you want to arrange travel around several appointments, welcome a business guest or coordinate a journey in advance. Share your schedule so our team can discuss the right booking format.</p></details>
          <details><summary>Can I book for a client or colleague?</summary><p>Yes. Choose “Booking for someone else” when entering contact details in the quote form. Add the passenger’s details and your own booking contact information, plus any pick-up sign or chauffeur instructions.</p></details>
          <details><summary>Can I arrange several meetings or book by the hour?</summary><p>The quote form supports multiple trips and an hourly service. Include your planned stops and timing. Availability, waiting arrangements and any additional charges are confirmed with your quote.</p></details>
          <details><summary>Can you arrange corporate airport transfers?</summary><p>Request a transfer to or from Sydney Airport or Western Sydney International Airport using our <Link href="/airport-transfers#airport-quote">airport transfer form</Link>. Include your flight number, terminal, preferred pick-up time and luggage details.</p></details>
          <details><summary>How do I choose a vehicle?</summary><p>Explore our <Link href="/fleet">fleet</Link> and add a preference to your quote request. Share passenger and luggage numbers so our team can check capacity and availability.</p></details>
        </div>
      </section>

      <section className="contact-section"><div><p className="eyebrow">Make room for what matters</p><h2>Let’s plan your next business journey.</h2><p>Talk through your itinerary with our team.</p></div><a className="gold-button" href="tel:0416934865"><Phone size={20} />0416 934 865</a></section>
    </main>
    <footer className="footer"><Logo /><p>Chauffeur &amp; limousine services · Sydney, Australia</p><span>© {new Date().getFullYear()} LIMO804. All rights reserved.</span></footer>
  </>;
}
