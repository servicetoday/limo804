import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { adminGuard } from '../../../../lib/admin-auth';

export const runtime = 'nodejs';
export async function POST(request) {
  const denied = await adminGuard(request); if (denied) return denied;
  if (Number(request.headers.get('content-length')) > 6 * 1024 * 1024) return Response.json({ error: 'Image must be under 5 MB.' }, { status: 413 });
  try {
    const form = await request.formData();
    const file = form.get('image');
    if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024) return Response.json({ error: 'Choose a JPG, PNG or WebP image under 5 MB.' }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    let extension;
    if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 && file.type === 'image/jpeg') extension = 'jpg';
    else if (buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && file.type === 'image/png') extension = 'png';
    else if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' && file.type === 'image/webp') extension = 'webp';
    if (!extension) return Response.json({ error: 'Only JPG, PNG or WebP images are accepted.' }, { status: 400 });
    const name = `${randomBytes(16).toString('hex')}.${extension}`;
    const directory = path.join(process.cwd(), 'storage', 'fleet');
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, name), buffer, { flag: 'wx' });
    return Response.json({ image: `/uploads/fleet/${name}` }, { status: 201 });
  } catch { return Response.json({ error: 'Image upload failed. Please try again.' }, { status: 400 }); }
}
