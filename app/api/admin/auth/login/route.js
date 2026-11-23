import { NextResponse } from 'next/server';
import { createSession, sameText, sessionCookie, validOrigin } from '../../../../../lib/admin-auth';

const attempts = globalThis.limoLoginAttempts || { count: 0, until: 0 };
globalThis.limoLoginAttempts = attempts;
export async function POST(request) {
  if (!validOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403 });
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) return Response.json({ error: 'Admin access is not configured.' }, { status: 503 });
  if (Date.now() > attempts.until) { attempts.count = 0; attempts.until = Date.now() + 15 * 60 * 1000; }
  if (attempts.count >= 10) return Response.json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' }, { status: 429 });
  let data;
  try { const body = await request.text(); if (body.length > 2000) throw new Error(); data = JSON.parse(body); } catch { return Response.json({ error: 'Invalid sign-in request.' }, { status: 400 }); }
  if (!data || typeof data !== 'object' || typeof data.username !== 'string' || typeof data.password !== 'string' || !sameText(data.username, process.env.ADMIN_USERNAME) || !sameText(data.password, process.env.ADMIN_PASSWORD)) {
    attempts.count++;
    return Response.json({ error: 'Incorrect username or password.' }, { status: 401 });
  }
  attempts.count = 0;
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie, createSession(), { httpOnly: true, sameSite: 'strict', secure: new URL(request.url).protocol === 'https:', path: '/', maxAge: 8 * 60 * 60 });
  return response;
}
