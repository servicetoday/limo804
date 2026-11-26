import 'server-only';
import { db } from './db';
import { QuoteError } from './quote-validation';
import { optionalId, driverEmailType } from './driver-validation';
import { sendDriverBookingEmail } from './driver-booking-email';
import { sendDriverBookingSms } from './driver-booking-sms';
import { getQuote } from './quotes';

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
    let driverName = 'Unassigned', assignedDriver = null;
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
      assignedDriver = driver;
    }
    if (booking.assigned_driver_id === driverId && booking.assigned_fleet_id === vehicleId) {
      await c.commit(); return { unchanged: true, assignedDriverId: driverId, assignedFleetId: vehicleId, assignmentVersion: booking.driver_assignment_version };
    }
    let unassignedDriverName = null, unassignedDriverEmail = null;
    const smsNotifications = [];
    if (booking.assigned_driver_id !== driverId) {
      if (booking.assigned_driver_id !== null) {
        const [previous] = await c.execute('SELECT name, phone, email FROM drivers WHERE id = ? FOR UPDATE', [booking.assigned_driver_id]);
        if (driverId === null) {
          unassignedDriverName = previous[0]?.name || null;
          unassignedDriverEmail = previous[0]?.email || null;
        }
        if (previous[0]) smsNotifications.push({ driver: previous[0], notificationType: 'unassigned' });
      }
    }
    // Vehicle changes also refresh the private link for the current assignment version.
    if (assignedDriver) smsNotifications.push({ driver: assignedDriver, notificationType: 'assigned' });
    await c.execute('UPDATE bookings SET assigned_driver_id = ?, assigned_fleet_id = ?, unassigned_driver_name = ?, unassigned_driver_email = ?, driver_assignment_version = driver_assignment_version + 1 WHERE id = ?', [driverId, vehicleId, unassignedDriverName, unassignedDriverEmail, id]);
    await c.execute('INSERT INTO quote_status_history (quote_id, from_status, to_status, actor, note, created_at) SELECT id, status, status, ?, ?, UTC_TIMESTAMP() FROM quotes WHERE id = ?', [process.env.ADMIN_USERNAME || 'admin', `Booking ${booking.reference}: driver ${driverName}${vehicleId ? `; vehicle ID ${vehicleId}` : ''}.`, booking.quote_id]);
    await c.commit();
    return { assignedDriverId: driverId, assignedFleetId: vehicleId, assignmentVersion: booking.driver_assignment_version + 1, unassignedDriverName,
      smsContext: { booking: { ...booking, assigned_driver_id: driverId, assigned_fleet_id: vehicleId, driver_assignment_version: booking.driver_assignment_version + 1 }, notifications: smsNotifications } };
  } catch (error) { await c.rollback(); throw error; } finally { c.release(); }
}

export async function saveBookingAssignmentAndNotify(id, driverId, fleetId) {
  const { smsContext, ...assignment } = await assignBookingDriver(id, driverId, fleetId);
  // The transaction captures recipients before clearing or replacing the driver.
  // Only the request that changed the assignment sends SMS; repeated saves do not.
  const sendSms = async () => {
    const sms = [];
    for (const { driver, notificationType } of smsContext?.notifications || []) {
      try {
        const quote = notificationType === 'assigned' ? await getQuote(smsContext.booking.quote_id) : null;
        if (notificationType === 'assigned' && !quote) throw new QuoteError('Quote not found for the driver SMS.', 404);
        sms.push(await sendDriverBookingSms(smsContext.booking, driver, notificationType, quote));
      } catch (error) {
        sms.push({ status: 'unconfirmed', notificationType, error: `${driver.name}: ${error instanceof QuoteError ? error.message : 'Could not send the driver SMS. Check ClickSend SMS history.'}` });
      }
    }
    return { sms, ...(sms.some(result => result.error) ? { smsError: sms.filter(result => result.error).map(result => result.error).join(' ') } : {}) };
  };
  const sendEmail = async () => {
    if (!assignment.assignedDriverId && !assignment.unassignedDriverName) return { email: null };
    try {
      return { email: await sendDriverBookingEmail(id, { assignmentVersion: assignment.assignmentVersion }) };
    } catch (error) {
      // Assignment is already committed; notification failure must not appear to undo it.
      return { email: null, emailError: error instanceof QuoteError ? error.message : 'Could not send the driver email. Try Email driver again.' };
    }
  };
  const [email, sms] = await Promise.all([sendEmail(), sendSms()]);
  return { ...assignment, ...email, ...sms };
}
