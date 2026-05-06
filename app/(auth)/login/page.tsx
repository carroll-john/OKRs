'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('manager@demo.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const router = useRouter();
  return <main className="min-h-screen grid place-items-center p-4"><form className="bg-white p-6 rounded border w-full max-w-sm space-y-3" onSubmit={async e => {e.preventDefault(); const res = await signIn('credentials', { email, password, redirect: false }); if (res?.ok) router.push('/dashboard'); else setError('Invalid credentials');}}><h1 className="font-semibold">OKR Tracker Login</h1><input className="w-full border p-2 rounded" value={email} onChange={e=>setEmail(e.target.value)} /><input type="password" className="w-full border p-2 rounded" value={password} onChange={e=>setPassword(e.target.value)} /><button className="bg-slate-900 text-white px-3 py-2 rounded w-full">Sign in</button>{error && <p className="text-red-600 text-sm">{error}</p>}</form></main>;
}
