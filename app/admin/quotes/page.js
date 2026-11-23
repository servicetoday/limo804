import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdmin } from '../../../lib/admin-auth';
import { listQuotes } from '../../../lib/quotes';
import Logo from '../../components/Logo';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Quote Requests | Limo804 Admin', robots: { index: false, follow: false } };
export default async function QuotesPage() {
  if (!await isAdmin()) redirect('/admin/login');
  let quotes = []; let error = '';
  try { quotes = await listQuotes(); } catch { error = 'Could not load quotes. Check MySQL and run npm run db:setup.'; }
  return <div className="admin-shell"><header className="admin-header"><Logo /><div><Link href="/admin/fleet">Fleet manager</Link><Link href="/quote">Public quote form</Link></div></header><main className="admin-main"><div className="admin-title"><div><p className="eyebrow">Limo804 administration</p><h1>Quote requests</h1><p>Review enquiries, record pricing and acceptance, and create pending bookings.</p></div><span>Latest {quotes.length}</span></div>{error && <p className="admin-error" role="alert">{error}</p>}<section className="admin-inventory">{quotes.length === 0 ? <div className="admin-empty"><h3>No quote requests yet.</h3><p>Submitted quote requests will appear here.</p></div> : <div className="quote-table-scroll"><table className="quote-admin-table"><thead><tr><th>Reference</th><th>Passenger</th><th>Service</th><th>Status</th><th>Quoted total</th><th>Received (UTC)</th></tr></thead><tbody>{quotes.map(quote => <tr key={quote.id}><td><Link href={`/admin/quotes/${quote.id}`}>{quote.reference}</Link></td><td>{quote.passenger_name}</td><td>{quote.service_type === 'hourly' ? 'Hourly' : quote.journey_type}</td><td><span className={`quote-status status-${quote.status}`}>{quote.status}</span></td><td>{quote.quoted_total === null ? 'Not priced' : `${quote.currency} ${quote.quoted_total}`}</td><td>{quote.created_at}</td></tr>)}</tbody></table></div>}</section></main></div>;
}
