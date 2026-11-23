import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-cormorant' });
const sans = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'LIMO804 | Sydney Chauffeur & Limousine Service',
  description: 'Arrive in style. Explore premium airport transfers, corporate travel and private chauffeur services across Sydney with LIMO804.',
};

export default function RootLayout({ children }) {
  return <html lang="en-AU"><body className={`${serif.variable} ${sans.variable}`}>{children}</body></html>;
}
