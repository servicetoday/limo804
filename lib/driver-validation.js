import { QuoteError } from './quote-validation.js';
import { adminNotificationEmail } from './notification-settings.js';

export const driverEmail = adminNotificationEmail;
export function optionalId(value, label = 'ID') {
  if (value === null || value === '') return null;
  if (!['number', 'string'].includes(typeof value) || !/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > 4294967295) throw new QuoteError(`Invalid ${label}.`);
  return Number(value);
}
export function validateDriver(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new QuoteError('Driver details are required.');
  const text = (key, max, required = false) => {
    if (input[key] !== undefined && typeof input[key] !== 'string') throw new QuoteError(`Invalid ${key}.`);
    const value = (input[key] || '').trim();
    if ((required && !value) || value.length > max) throw new QuoteError(`Enter a valid ${key} (up to ${max} characters).`);
    return value;
  };
  const name = text('name', 150, true), phone = text('phone', 30, true), address = text('address', 500);
  const email = text('email', 254).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new QuoteError('Enter a valid driver email address.');
  const registration = text('registration', 20).toUpperCase();
  if (!/^[A-Z0-9 -]*$/.test(registration)) throw new QuoteError('Use letters, numbers, spaces or hyphens for the number plate.');
  if (!/^[\d\s()+.-]{6,30}$/.test(phone) || phone.replace(/\D/g, '').length < 6) throw new QuoteError('Enter a valid driver phone number.');
  return { name, phone, address, registration, email, assignedFleetId: optionalId(input.assignedFleetId, 'vehicle ID') };
}
export function driverEmailType(booking) {
  const prefix = !booking.assigned_driver_id && booking.unassigned_driver_name ? 'driver_off' : 'driver';
  return `${prefix}_b${booking.id}_v${booking.driver_assignment_version}`;
}
