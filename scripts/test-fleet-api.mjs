import assert from 'node:assert/strict';
import { readFile, unlink } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());

const base = 'http://localhost:3000';
let cookie = ''; let id = null; let uploadPath = '';
async function request(path, options = {}, authenticated = true) {
  return fetch(base + path, { ...options, headers: { Origin: base, ...(authenticated && cookie ? { Cookie: cookie } : {}), ...options.headers } });
}
const json = (method, value) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
try {
  assert.equal((await request('/api/admin/fleet', {}, false)).status, 401);
  assert.equal((await request('/api/admin/fleet', json('POST', {}), false)).status, 401);
  const unauthorizedPage = await fetch(base + '/admin/fleet', { redirect: 'manual' });
  assert.equal(unauthorizedPage.status, 307); assert.ok(unauthorizedPage.headers.get('location').includes('/admin/login'));
  const login = await request('/api/admin/auth/login', json('POST', { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD }), false);
  assert.equal(login.status, 200);
  assert.ok(login.headers.get('set-cookie').includes('HttpOnly'));
  cookie = login.headers.get('set-cookie').split(';')[0];
  const csrf = await request('/api/admin/fleet', { ...json('POST', {}), headers: { 'Content-Type': 'application/json', Origin: 'https://other.example' } });
  assert.equal(csrf.status, 403);
  assert.equal((await request('/api/admin/fleet', json('POST', { name: '' }))).status, 400);
  const imageBytes = await readFile('public/images/fleet-sedan.jpg');
  const upload = new FormData(); upload.set('image', new File([imageBytes], 'car.jpg', { type: 'image/jpeg' }));
  const uploaded = await request('/api/admin/uploads', { method: 'POST', body: upload }); assert.equal(uploaded.status, 201);
  uploadPath = (await uploaded.json()).image;
  assert.match(uploadPath, /^\/uploads\/fleet\/[a-f0-9]{32}\.jpg$/);
  const servedImage = await request(uploadPath, {}, false); assert.equal(servedImage.status, 200);
  assert.deepEqual(Buffer.from(await servedImage.arrayBuffer()), imageBytes);
  const unsafeFile = new FormData(); unsafeFile.set('image', new File(['<script>bad</script>'], 'bad.jpg', { type: 'image/jpeg' }));
  assert.equal((await request('/api/admin/uploads', { method: 'POST', body: unsafeFile })).status, 400);
  const vehicle = { name: `Integration Test ${Date.now()}`, category: 'sedan', passengers: 3, suitcases: 3, image: uploadPath, imageAlt: 'Integration test vehicle', tagline: 'Test record', description: 'Temporary integration test record.', details: '', features: ['Test'], isActive: false, sortOrder: 9999 };
  const created = await request('/api/admin/fleet', json('POST', vehicle)); assert.equal(created.status, 201);
  const saved = (await created.json()).vehicle; id = saved.id;
  assert.equal(saved.name, vehicle.name);
  assert.ok(!(await (await request('/api/fleet', {}, false)).json()).vehicles.some(item => item.id === id));
  assert.ok((await (await request('/api/admin/fleet')).json()).vehicles.some(item => item.id === id));
  assert.equal((await request(`/api/admin/fleet/${id}`, json('PUT', { ...vehicle, isActive: true, suitcases: 4 }))).status, 200);
  const publicList = (await (await request('/api/fleet', {}, false)).json()).vehicles;
  assert.equal(publicList.find(item => item.id === id).suitcases, 4);
  assert.ok((await (await request('/fleet', {}, false)).text()).includes(vehicle.name));
  assert.ok((await (await request(`/quote?vehicle=sedan&fleet=${id}`, {}, false)).text()).includes(vehicle.name));
  assert.equal((await request(`/api/admin/fleet/${id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await request(`/api/admin/fleet/${id}`)).status, 404);
  assert.ok(!(await (await request('/api/fleet', {}, false)).json()).vehicles.some(item => item.id === id));
  assert.equal((await request('/api/admin/auth/logout', { method: 'POST' })).status, 200);
  console.log('PASS: admin authorization, session login, CSRF rejection, validation, upload/download, draft visibility, create/update/publish, public page, quote preference, archive and logout.');
} finally {
  if (id) {
    const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME });
    try { await connection.execute("DELETE FROM fleet WHERE id = ? AND name LIKE 'Integration Test %'", [id]); } finally { await connection.end(); }
  }
  if (/^\/uploads\/fleet\/[a-f0-9]{32}\.jpg$/.test(uploadPath)) await unlink('storage/fleet/' + uploadPath.split('/').pop());
}
