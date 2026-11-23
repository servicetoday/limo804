import 'server-only';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const sessionCookie = 'limo804_admin';
export function sameText(a, b) {
  const left = Buffer.from(a || ''); const right = Buffer.from(b || '');
  return left.length === right.length && timingSafeEqual(left, right);
}
function sign(value) { return createHmac('sha256', process.env.ADMIN_SESSION_SECRET).update(value).digest('hex'); }
export function createSession() {
  const payload = Buffer.from(JSON.stringify({ user: process.env.ADMIN_USERNAME, expires: Date.now() + 8 * 60 * 60 * 1000, nonce: randomBytes(16).toString('hex') })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}
export async function isAdmin() {
  if (!process.env.ADMIN_SESSION_SECRET) return false;
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return false;
  try {
    const [payload, signature, extra] = token.split('.');
    if (extra || !signature || !sameText(sign(payload), signature)) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.user === process.env.ADMIN_USERNAME && data.expires > Date.now();
  } catch { return false; }
}
export function validOrigin(request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}
export async function adminGuard(request) {
  if (!await isAdmin()) return Response.json({ error: 'Please sign in.' }, { status: 401 });
  if (request.method !== 'GET' && !validOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  return null;
}
