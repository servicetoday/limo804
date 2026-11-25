import Link from 'next/link';
import { ArrowRight, CalendarClock, CarFront, Gift, Heart, MapPin, PartyPopper, Phone, Sparkles, Users, UserRound } from 'lucide-react';
import Logo from '../components/Logo';
import ManageBookingLink from '../components/ManageBookingLink';
import styles from '../components/ServicePage.module.css';

export const metadata = {
  title: 'Wedding Cars & Special Occasion Chauffeurs Sydney | LIMO804',
  description: 'Make your wedding, birthday, party or anniversary journey part of the celebration. Plan private chauffeur transport across Sydney with LIMO804.',
};

const occasions = [
  { icon: Heart, title: 'Weddings & bridal transport', text: 'From getting ready to the ceremony, photographs and reception, plan a journey around the moments that matter. Share your venue addresses, bridal party numbers and timings so we can discuss suitable vehicles and the route for your day.' },
  { icon: Gift, title: 'Birthdays & milestone celebrations', text: 'Make the journey part of the birthday treat. Whether it is a surprise dinner, a milestone celebration or a special evening with friends, arrange a private transfer and a memorable arrival at your chosen venue.' },
  { icon: PartyPopper, title: 'Parties & nights out', text: 'Get your evening off to a relaxed start with transport to a party, restaurant or celebration. Discuss pick-up points, passenger numbers and a return journey so your travel plans are arranged before the night begins.' },
  { icon: Sparkles, title: 'Anniversaries & romantic evenings', text: 'Mark an anniversary, engagement or date night with a little extra care. Plan a private chauffeur journey to dinner, a harbour venue or a hotel, with the timing and destination chosen around your occasion.' },
  { icon: Users, title: 'Engagements & family gatherings', text: 'Bring the people who matter into your plans. Discuss transport for an engagement celebration, a family lunch or visiting relatives, including separate pick-up addresses and any luggage or accessibility needs.' },
  { icon: CalendarClock, title: 'Formals, galas & special events', text: 'Make a considered entrance at a school formal, awards evening or gala. Share the event arrival time, venue access instructions and your preferred collection time when requesting a quote.' },
];

export default function WeddingsPage() {
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><ManageBookingLink /><div className={`header-inner ${styles.header}`}>
      <Logo />
      <nav aria-label="Main navigation"><Link href="/">Home</Link><Link href="/fleet">Our Fleet</Link><Link href="/airport-transfers">Airport Transfers</Link><Link href="/corporate">Corporate</Link><Link href="/weddings" aria-current="page">Weddings</Link><Link href="/contact">Contact</Link></nav>
      <Link className="gold-button" href="/quote">Get a quote</Link>
    </div></header>
    <main id="main" className={styles.main}>
      <section className={`hero landing-hero ${styles.hero}`} aria-labelledby="weddings-heading">
        <div className={`hero-photo ${styles.photo}`} style={{ backgroundImage: "url('/images/wedding.jpg')" }} /><div className={`hero-shade ${styles.shade}`} />
        <div className="hero-inner"><div className="hero-copy">
          <p className="eyebrow">Sydney weddings &amp; special occasions<span /></p>
          <h1 id="weddings-heading">A special day.<br />A beautiful arrival.</h1>
          <p className="hero-description">Weddings, birthdays and evenings worth celebrating.<br className="desktop-break" /> Make the journey part of the occasion<br className="desktop-break" /> with a private chauffeur across Sydney.</p>
          <div className="hero-actions"><Link className="gold-button ride-button" href="/quote">Plan your celebration <ArrowRight size={20} /></Link><a className="fleet-link" href="#occasions">Explore the occasions <ArrowRight size={19} /></a></div>
        </div></div>
      </section>
      <section className="benefits" aria-label="Your celebration journey"><div className="benefits-inner">{[{ icon: UserRound, text: 'Professional Chauffeurs' }, { icon: CarFront, text: 'Luxury Fleet' }, { icon: Heart, text: 'Special Occasions' }, { icon: MapPin, text: 'Tailored Journeys' }].map(({ icon: Icon, text }) => <div className="benefit" key={text}><Icon strokeWidth={1.35} /><span>{text}</span></div>)}</div></section>

      <section className={`section-shell ${styles.intro}`} aria-labelledby="wedding-intro">
        <div><p className="eyebrow">The little details matter</p><h2 id="wedding-intro">Your moment.<br />Your kind of journey.</h2></div>
        <div><p>A wedding day, a milestone birthday or a long-awaited celebration deserves a thoughtful start. Enjoy time with the people you are celebrating with while your chauffeur takes care of the drive.</p><p>Tell LIMO804 about your occasion, your party size and the details that matter. From a single arrival to several venues across the day, our team can discuss an itinerary and vehicle suited to your plans.</p></div>
      </section>

      <section id="occasions" className={`section-shell ${styles.occasions}`} aria-labelledby="occasions-heading">
        <p className="eyebrow">More reasons to celebrate</p><h2 id="occasions-heading">For the big days.<br />And the just-because evenings.</h2>
        <div className={styles.cards}>{occasions.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={27} strokeWidth={1.4} /><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className={styles.planning} aria-labelledby="planning-heading"><div className={`section-shell ${styles.planningInner}`}>
        <div><p className="eyebrow">Every detail. Taken care of.</p><h2 id="planning-heading">A little planning.<br />A more relaxed celebration.</h2><p>Share your plans early so our team can check vehicle availability and discuss timings. Your quote will reflect the journey you agree, including any planned stops and waiting arrangements.</p><Link className="gold-button" href="/quote">Get an occasion quote <ArrowRight size={18} /></Link></div>
        <ol className={styles.steps}>
          <li><span>01</span><div><h3>Set the scene</h3><p>Tell us the occasion, date, passenger numbers and preferred vehicle. For weddings, include the bridal party and any separate guest journeys.</p></div></li>
          <li><span>02</span><div><h3>Plan the moments in between</h3><p>Add pick-up addresses, venues and arrival times. Include photography stops, time at each location and your return collection if required.</p></div></li>
          <li><span>03</span><div><h3>Confirm the details</h3><p>Discuss luggage, child seats, space for wedding attire and any special requests. Our team will confirm suitability, availability and pricing before you book.</p></div></li>
        </ol>
      </div></section>

      <section className={`section-shell ${styles.faq}`} aria-labelledby="faq-heading">
        <div><p className="eyebrow">Before your big day</p><h2 id="faq-heading">A few celebration questions.</h2></div>
        <div>
          <details><summary>Can you arrange wedding transport between several venues?</summary><p>Share your preparation address, ceremony, photography locations and reception venue. Use stops or multiple trips in the <Link href="/quote">quote form</Link> and include the timing at each location so our team can discuss a suitable itinerary.</p></details>
          <details><summary>Do you provide transport for birthdays and parties?</summary><p>Yes. Request a private transfer for a birthday dinner, party or special night out. Include everyone travelling, any separate pick-up points and the venue address. Vehicle suitability and availability are confirmed with your quote.</p></details>
          <details><summary>Can we book a return ride after the event?</summary><p>Choose a return journey in the quote form and add your preferred collection date and time. If you need a different route home, add multiple trips or discuss the details with our team.</p></details>
          <details><summary>Can we request decorations or other special touches?</summary><p>Tell us what you have in mind when enquiring. Decorations, refreshments and other extras need to be discussed and confirmed in advance; they are not automatically included.</p></details>
          <details><summary>Which vehicle should we choose?</summary><p>Explore our <Link href="/fleet">fleet</Link> and share passenger numbers, luggage and any space needed for formal or bridal attire. For larger parties or guests needing extra assistance, contact us to discuss suitable arrangements.</p></details>
          <details><summary>How do we request a quote?</summary><p>Use our <Link href="/quote">journey planner</Link> and add the occasion and special requirements in the note for your chauffeur. Our team reviews your request and confirms pricing and availability. Sending an enquiry does not confirm a booking.</p></details>
        </div>
      </section>
      <section className="contact-section"><div><p className="eyebrow">Make your arrival exceptional</p><h2>Your celebration starts with the journey.</h2><p>Talk through your wedding, birthday or party plans with our team.</p></div><a className="gold-button" href="tel:0416934865"><Phone size={20} />0416 934 865</a></section>
    </main>
    <footer className="footer"><Logo /><p>Chauffeur &amp; limousine services · Sydney, Australia</p><span>© {new Date().getFullYear()} LIMO804. All rights reserved.</span></footer>
  </>;
}
