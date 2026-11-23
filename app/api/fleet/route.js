import { listFleet } from '../../../lib/fleet';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return Response.json({ vehicles: await listFleet() }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ error: 'Fleet is temporarily unavailable.' }, { status: 503 }); }
}
