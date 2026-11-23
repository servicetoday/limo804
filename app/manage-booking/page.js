import Link from 'next/link';
import { CalendarCheck, Phone } from 'lucide-react';
import Logo from '../components/Logo';

export const metadata = {
  title: 'Manage Booking | LIMO804',
  description: 'Contact LIMO804 for help with an existing chauffeur booking, travel changes or cancellation enquiries.',
};

export default function ManageBookingPage() {
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><div className="header-inner quote-header"><Logo /><Link className="quote-home-link" href="/">Back to home</Link><Link className="gold-button header-book" href="/quote">Book now</Link></div></header>
    <main id="main" className="quote-main">
      <div className="quote-intro"><p className="eyebrow">Here for every journey</p><h1>Manage your booking.</h1><p>Plans changed? Let’s take care of the details.</p></div>
      <section className="quote-panel manage-panel" aria-labelledby="manage-heading">
        <CalendarCheck className="manage-icon" size={34} strokeWidth={1.5} aria-hidden="true" />
        <div className="quote-panel-heading"><h2 id="manage-heading">Help with an existing booking</h2><p>Contact our team to check your booking details or discuss a change or cancellation. Have your booking reference and the name used for your booking ready when you call.</p></div>
        <a className="gold-button" href="tel:13005466804"><Phone size={19} />Call 1300 LIMO 804</a>
        <p className="quote-help">Booking changes are handled by our team over the phone.</p>
      </section>
    </main>
    <footer className="footer"><Logo /><p>Chauffeur & limousine services · Sydney, Australia</p><span>© {new Date().getFullYear()} LIMO804. All rights reserved.</span></footer>
  </>;
}
