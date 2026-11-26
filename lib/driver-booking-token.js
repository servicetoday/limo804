import { createHmac, timingSafeEqual } from 'node:crypto';

const tokenPattern = /^([1-9]\d{0,9})\.(\d{1,10})\.(\d{10})\.([A-Za-z0-9_-]{43})$/;
const linkSecret = () => process.env.DRIVER_BOOKING_LINK_SECRET || process.env.ADMIN_SESSION_SECRET;

export function driverBookingToken(booking, secret, expiresAt = Math.floor(Date.now() / 1000) + 30 * 86400) {
  if (!secret) throw new Error('Driver booking link signing is not configured.');
  if (!booking.assigned_driver_id) throw new Error('Assign a driver before creating a booking link.');
  const payload = `${booking.id}.${booking.driver_assignment_version}.${expiresAt}`;
  const signature = createHmac('sha256', secret).update(`driver-booking:${payload}:${booking.assigned_driver_id}`).digest('base64url');
  return `${payload}.${signature}`;
}

export function driverBookingTokenId(token) {
  return typeof token === 'string' ? token.match(tokenPattern)?.[1] || null : null;
}

export function verifyDriverBookingToken(token, booking, secret, now = Date.now()) {
  if (!driverBookingTokenId(token) || !booking?.assigned_driver_id || !secret || ['cancelled', 'completed'].includes(booking.status)) return false;
  const expiresAt = Number(token.split('.')[2]);
  if (expiresAt * 1000 <= now) return false;
  const expected = Buffer.from(driverBookingToken(booking, secret, expiresAt));
  const supplied = Buffer.from(token);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export function driverBookingUrl(booking) {
  // Driver notifications must open the live site, including when sent from local preview.
  return `https://limo804.com.au/driver/booking/${driverBookingToken(booking, linkSecret())}`;
}

export function currentDriverBookingToken(token, booking) {
  return verifyDriverBookingToken(token, booking, linkSecret());
}
