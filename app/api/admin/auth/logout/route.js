import { NextResponse } from 'next/server';
import { adminGuard, sessionCookie } from '../../../../../lib/admin-auth';
export async function POST(request) {
  const denied = await adminGuard(request); if (denied) return denied;
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie, '', { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
}
