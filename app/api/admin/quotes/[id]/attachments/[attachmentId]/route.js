import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { adminGuard } from '../../../../../../../lib/admin-auth';
import { db } from '../../../../../../../lib/db';
import { quoteErrorResponse, quoteId } from '../../../../../../../lib/quote-http';
export const runtime = 'nodejs';
export async function GET(request, context) {
  const denied = await adminGuard(request); if (denied) return denied;
  try {
    const id = await quoteId(context); const { attachmentId } = await context.params;
    if (!/^\d+$/.test(attachmentId)) return new Response('Not found', { status: 404 });
    const [rows] = await db.execute('SELECT * FROM quote_attachments WHERE id = ? AND quote_id = ?', [attachmentId, id]);
    const file = rows[0];
    if (!file || !/^[a-f0-9]{32}\.(pdf|jpg|png|webp|heic)$/.test(file.storage_name)) return new Response('Not found', { status: 404 });
    const bytes = await readFile(path.join(process.cwd(), 'storage', 'quotes', file.storage_name));
    return new Response(bytes, { headers: { 'Content-Type': file.mime_type, 'Content-Disposition': `attachment; filename="itinerary.${file.storage_name.split('.').pop()}"; filename*=UTF-8''${encodeURIComponent(file.original_name)}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'" } });
  } catch (error) { return quoteErrorResponse(error); }
}
