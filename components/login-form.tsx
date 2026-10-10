'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, KeyRound, Sparkles } from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

export default function LoginForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const configured = isSupabaseConfigured();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!configured) {
      setError('Supabase is not connected yet. Add your Supabase URL and publishable key to .env.local, then restart the app.');
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;
        if (!data.session) {
          setMessage('Account created. Check your email for the confirmation link, then sign in.');
        } else {
          window.location.href = '/';
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        window.location.href = '/';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-art">
        <Link href="/" className="brand brand-light"><span className="brand-mark"><Sparkles size={19} /></span><span>rolepath<span className="brand-ai">.ai</span></span></Link>
        <div className="auth-art-copy">
          <div className="eyebrow eyebrow-light"><span className="pulse-dot" /> YOUR CAREER, IN FOCUS</div>
          <h1>Turn your next role into a clear learning plan.</h1>
          <p>A personal AI mentor to help you learn the right things, build proof of skill, and walk into interviews prepared.</p>
          <div className="auth-proof"><span className="proof-avatars"><i>S</i><i>R</i><i>A</i></span><span><strong>Built around your goal</strong><small>Not another generic course list</small></span></div>
        </div>
        <div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" />
        <div className="auth-art-bottom">Learn with intention. Interview with confidence.</div>
      </div>
      <section className="auth-panel">
        <Link href="/" className="back-link"><ArrowLeft size={16} /> Back to preview</Link>
        <div className="auth-card">
          <div className="auth-icon"><KeyRound size={21} /></div>
          <h2>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="muted">{mode === 'signin' ? 'Pick up where your career growth left off.' : 'Set up your space and start learning with purpose.'}</p>
          <div className="auth-switch"><button className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setError(''); setMessage(''); }}>Sign in</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setError(''); setMessage(''); }}>Create account</button></div>
          <form onSubmit={submit} className="auth-form">
            <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label>Password<input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" /></label>
            {error && <div className="form-alert error-alert">{error}</div>}
            {message && <div className="form-alert success-alert">{message}</div>}
            <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in to RolePath' : 'Create my account'}<ArrowRight size={17} /></button>
          </form>
          <div className="auth-footnote">Your progress is private to your account. <span>✦</span></div>
        </div>
        <div className="auth-panel-foot">By continuing, you agree to learn something useful today.</div>
      </section>
    </main>
  );
}
