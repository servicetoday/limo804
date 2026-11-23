import Link from 'next/link';
import { CalendarCheck } from 'lucide-react';

export default function ManageBookingLink() {
  return <div className="booking-utility"><div className="booking-utility-inner"><Link href="/manage-booking"><CalendarCheck size={16} aria-hidden="true" />Manage Booking</Link></div></div>;
}
