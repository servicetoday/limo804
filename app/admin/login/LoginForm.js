'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function LoginForm() {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const router = useRouter();
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget));
      const response = await fetch('/api/admin/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.replace('/admin/fleet'); router.refresh();
    } catch (error) { setError(error.message || 'Unable to sign in.'); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="admin-form"><label>Username<input name="username" autoComplete="username" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label>{error && <p className="admin-error" role="alert">{error}</p>}<button className="gold-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form>;
}
