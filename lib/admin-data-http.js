import { QuoteError } from './quote-validation';
export async function recordId(context) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1 || Number(id) > 4294967295) throw new QuoteError('Invalid record ID.');
  return Number(id);
}
export async function readAdminData(request) {
  const text = await request.text();
  if (text.length > 5000) throw new QuoteError('Request is too large.', 413);
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new QuoteError('Invalid request data.');
  return data;
}
export function adminDataError(error) {
  if (error instanceof QuoteError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError) return Response.json({ error: 'Invalid request data.' }, { status: 400 });
  console.error('Admin data operation failed:', error.code || error.name);
  return Response.json({ error: 'Could not complete this action. Please try again.' }, { status: 503 });
}
