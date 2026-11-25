import Link from 'next/link';
import { ArrowRight, Mail, MapPin, Phone } from 'lucide-react';
import Logo from '../components/Logo';
import ContactForm from './ContactForm';
import styles from './contact.module.css';

export const metadata = {
  title: 'Contact Us | LIMO804',
  description: 'Contact LIMO804 for Sydney chauffeur services, airport transfers and booking enquiries. Call 0416 934 865 or send our team a message.',
};

export default function ContactPage() {
  return <div className={styles.page}>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className={`site-header ${styles.header}`}><div className="header-inner"><Logo /><nav className={styles.navigation} aria-label="Main navigation"><Link href="/">Home</Link><Link href="/fleet">Our fleet</Link><Link href="/contact" aria-current="page">Contact</Link><Link href="/quote" className={styles.quoteLink}>Get a quote<ArrowRight size={15} /></Link></nav></div></header>
    <main id="main" className={styles.main}>
      <div className={styles.intro}><p>GET IN TOUCH</p><h1>Let’s talk about your journey.</h1><span>A question, a special request, or help with a booking. We’re here to help.</span></div>
      <div className={styles.layout}>
        <aside className={styles.details} aria-label="Contact information"><h2>A personal touch,<br />from the first hello.</h2><p>Reach our Sydney team directly or leave a message using the form.</p>
          <a href="tel:0416934865"><Phone size={19} /><span><small>Call us</small>0416 934 865</span></a>
          <a href="mailto:admin@limo804.com.au"><Mail size={19} /><span><small>Email us</small>admin@limo804.com.au</span></a>
          <div className={styles.location}><MapPin size={19} /><span><small>Our service area</small>Sydney, Australia</span></div>
          <div className={styles.bookingNote}><h3>Planning a ride?</h3><p>Share your route and travel details for a personalised quote.</p><Link href="/quote">Plan your journey<ArrowRight size={15} /></Link></div>
        </aside>
        <section className={styles.card} aria-label="Contact form"><ContactForm /></section>
      </div>
    </main>
    <footer className={styles.footer}><span>© {new Date().getFullYear()} LIMO804</span><Link href="/">Sydney chauffeur &amp; limousine services</Link></footer>
  </div>;
}
