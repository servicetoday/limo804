import 'server-only';
import { db } from './db';
import { QuoteError } from './quote-validation';
import { sendDriverBookingSms } from './driver-booking-sms';

export async function resendDriverBookingSms(id, assignmentVersion) {
  if (!Number.isSafeInteger(assignmentVersion) || assignmentVersion < 0) throw new QuoteError('Invalid assignment version. Refresh the booking and try again.');
  const c = await db.getConnection();
  try {
    await c.beginTransaction();
    const [rows] = await c.execute('SELECT * FROM bookings WHERE id = ? FOR UPDATE', [id]);
    const booking = rows[0];
    if (!booking) throw new QuoteError('Booking not found.', 404);
    if (booking.driver_assignment_version !== assignmentVersion) throw new QuoteError('The booking assignment changed. Refresh the booking before sending.', 409);
    if (['cancelled', 'completed'].includes(booking.status)) throw new QuoteError('This booking can no longer be sent to a driver.', 409);
    if (!booking.assigned_driver_id) throw new QuoteError('Assign a driver before sending an SMS.');
    const [drivers] = await c.execute('SELECT * FROM drivers WHERE id = ? FOR UPDATE', [booking.assigned_driver_id]);
    if (!drivers[0]) throw new QuoteError('The assigned driver is unavailable.', 409);
    const [quotes] = await c.execute('SELECT customer_reference FROM quotes WHERE id = ?', [booking.quote_id]);
    if (!quotes[0]) throw new QuoteError('Quote not found.', 404);
    // Keep the assignment locked through this manual send so its link stays current.
    const result = await sendDriverBookingSms(booking, drivers[0], 'assigned', quotes[0]);
    await c.commit();
    return result;
  } catch (error) { await c.rollback(); throw error; } finally { c.release(); }
}
