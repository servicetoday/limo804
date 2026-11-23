import { adminGuard } from '../../../../lib/admin-auth';
import { createFleet, listFleet } from '../../../../lib/fleet';
import { validateFleet } from '../../../../lib/fleet-validation';

export async function GET(request) {
  const denied = await adminGuard(request); if (denied) return denied;
  try { return Response.json({ vehicles: await listFleet(true) }, { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return Response.json({ error: 'Could not load fleet. Check the database connection.' }, { status: 503 }); }
}
export async function POST(request) {
  const denied = await adminGuard(request); if (denied) return denied;
  let vehicle;
  try { const body = await request.text(); if (body.length > 30000) throw new Error('Vehicle data is too large.'); vehicle = validateFleet(JSON.parse(body)); }
  catch (error) { return Response.json({ error: error instanceof SyntaxError ? 'Invalid JSON.' : error.message }, { status: 400 }); }
  try { return Response.json({ vehicle: await createFleet(vehicle) }, { status: 201 }); }
  catch { return Response.json({ error: 'Could not save vehicle. Please check the database and try again.' }, { status: 503 }); }
}
