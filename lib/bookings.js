import 'server-only';
import { db } from './db';
import { driverEmail } from './driver-validation';

export async function listBookings() {
  const [rows] = await db.execute(`
    SELECT b.id, b.reference, b.status, b.total_amount, b.currency, b.created_at,
      b.assigned_driver_id, b.assigned_fleet_id, b.driver_assignment_version, b.unassigned_driver_name,
      d.name AS driver_name, e.status AS driver_email_status, e.last_error AS driver_email_error,
      q.id AS quote_id, q.reference AS quote_reference, q.service_type, q.journey_type,
      p.display_name AS passenger_name, f.name AS vehicle_name,
      j.pickup_location, j.dropoff_location, j.pickup_local_date, j.pickup_local_time,
      j.timezone, j.timing_source, j.arriving_flight, j.passengers,
      (SELECT COUNT(*) FROM quote_journeys WHERE quote_id = q.id) AS journey_count
    FROM bookings b
    JOIN quotes q ON q.id = b.quote_id
    JOIN customers p ON p.id = q.passenger_id
    LEFT JOIN fleet f ON f.id = b.assigned_fleet_id
    LEFT JOIN drivers d ON d.id = b.assigned_driver_id
    LEFT JOIN quote_emails e ON e.quote_id = b.quote_id AND e.email_type = CONCAT(IF(b.assigned_driver_id IS NULL AND b.unassigned_driver_name IS NOT NULL, 'driver_off_b', 'driver_b'), b.id, '_v', b.driver_assignment_version) AND e.recipient = ?
    LEFT JOIN quote_journeys j ON j.quote_id = q.id AND j.sequence_number = 1
    ORDER BY b.created_at DESC, b.id DESC
    LIMIT 200
  `, [driverEmail]);
  if (!rows.length) return rows;
  const quoteIds = [...new Set(rows.map(row => row.quote_id))];
  const [journeys] = await db.execute(`SELECT id, quote_id, sequence_number, leg_type, passengers FROM quote_journeys WHERE quote_id IN (${quoteIds.map(() => '?').join(',')}) ORDER BY sequence_number`, quoteIds);
  return rows.map(row => ({ ...row, journeys: journeys.filter(journey => journey.quote_id === row.quote_id) }));
}
