import 'server-only';
import { db } from './db.js';
import { QuoteError } from './quote-validation.js';
import { validatePassengerUpdate, checkPassengerCapacity } from './passenger-count.js';
import { driverEmailType } from './driver-validation.js';

export async function saveBookingPassengers(id, input) {
  const data = validatePassengerUpdate(input);
  const c = await db.getConnection();
  try {
    await c.beginTransaction();
    const [bookings] = await c.execute('SELECT b.*, q.preferred_fleet_id FROM bookings b JOIN quotes q ON q.id = b.quote_id WHERE b.id = ? FOR UPDATE', [id]);
    const booking = bookings[0];
    if (!booking) throw new QuoteError('Booking not found.', 404);
    if (['cancelled', 'completed'].includes(booking.status)) throw new QuoteError('Passenger counts cannot be changed for a closed booking.', 409);
    const [journeys] = await c.execute('SELECT id, sequence_number, passengers FROM quote_journeys WHERE id = ? AND quote_id = ? FOR UPDATE', [data.journeyId, booking.quote_id]);
    const journey = journeys[0];
    if (!journey) throw new QuoteError('Journey not found for this booking.', 404);
    if (journey.passengers !== data.previousPassengers) throw new QuoteError('This passenger count changed elsewhere. Refresh and try again.', 409);
    const vehicleId = booking.assigned_fleet_id || booking.preferred_fleet_id;
    if (vehicleId) {
      const [vehicles] = await c.execute('SELECT passengers FROM fleet WHERE id = ? FOR UPDATE', [vehicleId]);
      checkPassengerCapacity(data.passengers, vehicles[0]?.passengers);
    }
    const [sending] = await c.execute("SELECT id FROM quote_emails WHERE quote_id = ? AND email_type = ? AND status IN ('sending', 'unknown') FOR UPDATE", [booking.quote_id, driverEmailType(booking)]);
    if (sending.length) throw new QuoteError('Check the current driver email before changing journey details.', 409);
    if (journey.passengers !== data.passengers) {
      await c.execute('UPDATE quote_journeys SET passengers = ? WHERE id = ? AND quote_id = ?', [data.passengers, data.journeyId, booking.quote_id]);
      await c.execute('INSERT INTO quote_status_history (quote_id, from_status, to_status, actor, note, created_at) SELECT id, status, status, ?, ?, UTC_TIMESTAMP() FROM quotes WHERE id = ?', [process.env.ADMIN_USERNAME || 'admin', `Booking ${booking.reference}, trip ${journey.sequence_number}: passenger count changed from ${journey.passengers} to ${data.passengers}.`, booking.quote_id]);
    }
    await c.commit();
    return { journeyId: data.journeyId, passengers: data.passengers };
  } catch (error) { await c.rollback(); throw error; } finally { c.release(); }
}
