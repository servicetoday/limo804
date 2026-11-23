import { readFile } from 'node:fs/promises';
import path from 'node:path';
export const runtime = 'nodejs';
export async function GET(request, { params }) {
  const { filename } = await params;
  if (!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(filename)) return new Response('Not found', { status: 404 });
  try {
    const bytes = await readFile(path.join(process.cwd(), 'storage', 'fleet', filename));
    const contentType = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[filename.split('.').pop()];
    return new Response(bytes, { headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new Response('Not found', { status: 404 }); }
}
