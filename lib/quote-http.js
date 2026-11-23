import { QuoteError } from './quote-validation';
export function quoteErrorResponse(error) {
  if (error instanceof QuoteError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError) return Response.json({ error: 'Invalid quote data.' }, { status: 400 });
  console.error('Quote operation failed:', error.code || error.name);
  return Response.json({ error: 'We could not save your request. Please try again or call our team.' }, { status: 503 });
}
export async function quoteId(context) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1 || Number(id) > 4294967295) throw new QuoteError('Invalid quote ID.');
  return Number(id);
}
