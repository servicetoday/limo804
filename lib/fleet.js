import 'server-only';
import { db } from './db';

const columns = 'id, name, category, passengers, suitcases, image, image_alt, tagline, description, details, features, is_active, sort_order';
function serialize(row) {
  return { id: row.id, name: row.name, category: row.category, passengers: row.passengers, suitcases: row.suitcases, image: row.image, imageAlt: row.image_alt, tagline: row.tagline, description: row.description, details: row.details, features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features, isActive: Boolean(row.is_active), sortOrder: row.sort_order };
}
export async function listFleet(admin = false) {
  const [rows] = await db.execute(`SELECT ${columns} FROM fleet WHERE deleted_at IS NULL ${admin ? '' : 'AND is_active = TRUE'} ORDER BY sort_order, id DESC`);
  return rows.map(serialize);
}
export async function getFleet(id) {
  const [rows] = await db.execute(`SELECT ${columns} FROM fleet WHERE id = ? AND deleted_at IS NULL`, [id]);
  return rows[0] ? serialize(rows[0]) : null;
}
function values(vehicle) { return [vehicle.name, vehicle.category, vehicle.passengers, vehicle.suitcases, vehicle.image, vehicle.imageAlt, vehicle.tagline, vehicle.description, vehicle.details, JSON.stringify(vehicle.features), vehicle.isActive, vehicle.sortOrder]; }
export async function createFleet(vehicle) {
  const [result] = await db.execute('INSERT INTO fleet (name, category, passengers, suitcases, image, image_alt, tagline, description, details, features, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', values(vehicle));
  return getFleet(result.insertId);
}
export async function updateFleet(id, vehicle) {
  const [result] = await db.execute('UPDATE fleet SET name=?, category=?, passengers=?, suitcases=?, image=?, image_alt=?, tagline=?, description=?, details=?, features=?, is_active=?, sort_order=? WHERE id=? AND deleted_at IS NULL', [...values(vehicle), id]);
  return result.affectedRows ? getFleet(id) : null;
}
export async function removeFleet(id) {
  const [result] = await db.execute('UPDATE fleet SET deleted_at = CURRENT_TIMESTAMP, is_active = FALSE WHERE id = ? AND deleted_at IS NULL', [id]);
  return result.affectedRows > 0;
}
