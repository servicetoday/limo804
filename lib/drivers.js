import 'server-only';
import { db } from './db';
import { QuoteError } from './quote-validation';
import { validateDriver } from './driver-validation';

export async function listDrivers() {
  const [rows] = await db.execute(`SELECT d.*, f.name AS vehicle_name,
    (f.id IS NOT NULL AND f.is_active = TRUE AND f.deleted_at IS NULL) AS vehicle_available,
    f.passengers AS vehicle_passengers
    FROM drivers d LEFT JOIN fleet f ON f.id = d.assigned_fleet_id ORDER BY d.name, d.id`);
  return rows;
}

export async function saveDriver(raw, id = null) {
  const driver = validateDriver(raw);
  const c = await db.getConnection();
  try {
    await c.beginTransaction();
    if (id !== null) {
      const [existing] = await c.execute('SELECT id, vehicle_registration FROM drivers WHERE id = ? FOR UPDATE', [id]);
      if (!existing.length) throw new QuoteError('Driver not found.', 404);
      if (raw.registration === undefined) driver.registration = existing[0].vehicle_registration || '';
    }
    if (driver.assignedFleetId !== null) {
      const [fleet] = await c.execute('SELECT id FROM fleet WHERE id = ? AND deleted_at IS NULL AND is_active = TRUE FOR UPDATE', [driver.assignedFleetId]);
      if (!fleet.length) throw new QuoteError('Choose a published vehicle.');
    }
    const values = [driver.name, driver.email, driver.phone, driver.address || null, driver.assignedFleetId, driver.registration || null];
    if (id === null) {
      const [result] = await c.execute('INSERT INTO drivers (name, email, phone, address, assigned_fleet_id, vehicle_registration) VALUES (?, ?, ?, ?, ?, ?)', values);
      id = result.insertId;
    } else {
      await c.execute('UPDATE drivers SET name = ?, email = ?, phone = ?, address = ?, assigned_fleet_id = ?, vehicle_registration = ? WHERE id = ?', [...values, id]);
    }
    await c.commit();
    return { id, ...driver };
  } catch (error) { await c.rollback(); throw error; } finally { c.release(); }
}
