import 'server-only';
import { db } from './db';
import { QuoteError } from './quote-validation';
import { optionalId, driverEmailType } from './driver-validation';
import { sendDriverBookingEmail } from './driver-booking-email';

export async function assignBookingDriver(id, rawDriverId, rawFleetId) {
  const driverId = optionalId(rawDriverId, 'driver ID');
  const c = await db.getConnection();
  try {
    await c.beginTransaction();
    const [rows] = await c.execute('SELECT * FROM bookings WHERE id = ? FOR UPDATE', [id]);
    const booking = rows[0];
    if (!booking) throw new QuoteError('Booking not found.', 404);
    if (['cancelled', 'completed'].includes(booking.status)) throw new QuoteError('This booking can no longer be assigned.', 409);
    const [sending] = await c.execute("SELECT id FROM quote_emails WHERE quote_id = ? AND email_type = ? AND status IN ('sending', 'unknown') FOR UPDATE", [booking.quote_id, driverEmailType(booking)]);
    if (sending.length) throw new QuoteError('Check the current driver email in Mailtrap before changing this assignment.', 409);
    const vehicleId = rawFleetId === undefined ? booking.assigned_fleet_id : optionalId(rawFleetId, 'vehicle ID');
    let driverName = 'Unassigned';
    if (vehicleId !== null) {
      const [vehicles] = await c.execute('SELECT * FROM fleet WHERE id = ? AND is_active = TRUE AND deleted_at IS NULL FOR UPDATE', [vehicleId]);
      const vehicle = vehicles[0];
      if (!vehicle) throw new QuoteError('Choose a published vehicle.');
      const [capacity] = await c.execute('SELECT MAX(passengers) AS required FROM quote_journeys WHERE quote_id = ?', [booking.quote_id]);
      if (Number(capacity[0].required) > vehicle.passengers) throw new QuoteError('The selected vehicle cannot accommodate every journey’s passenger count.');
    }
    if (driverId !== null) {
      const [drivers] = await c.execute('SELECT * FROM drivers WHERE id = ? FOR UPDATE', [driverId]);
      const driver = drivers[0];
      if (!driver) throw new QuoteError('Driver not found.', 404);
      if (vehicleId !== null && driver.assigned_fleet_id !== vehicleId) throw new QuoteError('Choose a driver attached to the selected vehicle, or select Any vehicle.');
      driverName = driver.name;
    }
    if (booking.assigned_driver_id === driverId && booking.assigned_fleet_id === vehicleId) {
      await c.commit(); return { unchanged: true, assignedDriverId: driverId, assignedFleetId: vehicleId, assignmentVersion: booking.driver_assignment_version };
    }
    let unassignedDriverName = null;
    if (driverId === null && booking.assigned_driver_id !== null) {
      const [previous] = await c.execute('SELECT name FROM drivers WHERE id = ? FOR UPDATE', [booking.assigned_driver_id]);
      unassignedDriverName = previous[0]?.name || null;
    }
    await c.execute('UPDATE bookings SET assigned_driver_id = ?, assigned_fleet_id = ?, unassigned_driver_name = ?, driver_assignment_version = driver_assignment_version + 1 WHERE id = ?', [driverId, vehicleId, unassignedDriverName, id]);
    await c.execute('INSERT INTO quote_status_history (quote_id, from_status, to_status, actor, note, created_at) SELECT id, status, status, ?, ?, UTC_TIMESTAMP() FROM quotes WHERE id = ?', [process.env.ADMIN_USERNAME || 'admin', `Booking ${booking.reference}: driver ${driverName}${vehicleId ? `; vehicle ID ${vehicleId}` : ''}.`, booking.quote_id]);
    await c.commit();
    return { assignedDriverId: driverId, assignedFleetId: vehicleId, assignmentVersion: booking.driver_assignment_version + 1, unassignedDriverName };
  } catch (error) { await c.rollback(); throw error; } finally { c.release(); }
}

export async function saveBookingAssignmentAndNotify(id, driverId, fleetId) {
  const assignment = await assignBookingDriver(id, driverId, fleetId);
  if (!assignment.assignedDriverId && !assignment.unassignedDriverName) return { ...assignment, email: null };
  try {
    const email = await sendDriverBookingEmail(id, { assignmentVersion: assignment.assignmentVersion });
    return { ...assignment, email };
  } catch (error) {
    // Assignment is already committed; email failure must not appear to undo it.
    return { ...assignment, email: null, emailError: error instanceof QuoteError ? error.message : 'Could not send the driver email. Try Email driver again.' };
  }
}
