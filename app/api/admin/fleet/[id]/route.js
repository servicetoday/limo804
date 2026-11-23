import { adminGuard } from '../../../../../lib/admin-auth';
import { getFleet, removeFleet, updateFleet } from '../../../../../lib/fleet';
import { validateFleet } from '../../../../../lib/fleet-validation';

async function vehicleId(context) { const { id } = await context.params; return /^\d+$/.test(id) && Number.isSafeInteger(Number(id)) && Number(id) > 0 ? Number(id) : null; }
export async function GET(request, context) {
  const denied = await adminGuard(request); if (denied) return denied;
  const id = await vehicleId(context); if (!id) return Response.json({ error: 'Invalid vehicle ID.' }, { status: 400 });
  try { const vehicle = await getFleet(id); return vehicle ? Response.json({ vehicle }) : Response.json({ error: 'Vehicle not found.' }, { status: 404 }); }
  catch { return Response.json({ error: 'Could not load vehicle.' }, { status: 503 }); }
}
export async function PUT(request, context) {
  const denied = await adminGuard(request); if (denied) return denied;
  const id = await vehicleId(context); if (!id) return Response.json({ error: 'Invalid vehicle ID.' }, { status: 400 });
  let vehicle;
  try { const body = await request.text(); if (body.length > 30000) throw new Error('Vehicle data is too large.'); vehicle = validateFleet(JSON.parse(body)); }
  catch (error) { return Response.json({ error: error instanceof SyntaxError ? 'Invalid JSON.' : error.message }, { status: 400 }); }
  try { const saved = await updateFleet(id, vehicle); return saved ? Response.json({ vehicle: saved }) : Response.json({ error: 'Vehicle not found.' }, { status: 404 }); }
  catch { return Response.json({ error: 'Could not update vehicle.' }, { status: 503 }); }
}
export async function DELETE(request, context) {
  const denied = await adminGuard(request); if (denied) return denied;
  const id = await vehicleId(context); if (!id) return Response.json({ error: 'Invalid vehicle ID.' }, { status: 400 });
  try { return await removeFleet(id) ? Response.json({ ok: true }) : Response.json({ error: 'Vehicle not found.' }, { status: 404 }); }
  catch { return Response.json({ error: 'Could not archive vehicle.' }, { status: 503 }); }
}
