'use client';

import { FormEvent, useState } from 'react';
import { Compass, Eye, EyeOff, Lightbulb, Sparkles } from 'lucide-react';
import { CurioLogo } from '@/components/layout/CurioLogo';

type AuthMode = 'login' | 'register';

function responseError(value: unknown): string {
  if (value && typeof value === 'object' && 'error' in value && typeof value.error === 'string') {
    return value.error;
  }
  return 'We could not complete that request. Please try again.';
}

export function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'login'
            ? { action: 'login', email, password }
            : { action: 'register', username, display_name: displayName, email, password }
        ),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        setError(responseError(result));
        return;
      }
      window.location.reload();
    } catch {
      setError('We could not reach Curio. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    'w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-3.5 py-3 text-sm text-[var(--text-main)] outline-none transition focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--border-focus)]/20';

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-28 -top-32 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-36 -right-24 h-96 w-96 rounded-full bg-amber-400/15 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-2xl shadow-violet-950/10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between bg-gradient-to-br from-[#d85d4c] via-[#a75569] to-[#51499a] p-10 text-white lg:flex">
          <CurioLogo size="medium" darkBackground />

          <div className="max-w-md py-12">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/20">
              <Lightbulb size={28} />
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-tight">
              Follow your curiosity somewhere new.
            </h1>
            <p className="mt-4 text-sm leading-7 text-white/75">
              Meet curious minds, share what you discover, and explore the questions that connect us.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-white/65">
            <Compass size={15} />
            A community for ideas in every direction
          </div>
        </section>

        <section className="p-6 sm:p-10 lg:p-12">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <CurioLogo size="small" />
          </div>

          <div className="mb-7">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1.5 text-[11px] font-bold text-violet-700 dark:text-violet-300">
              <Sparkles size={13} />
              A little more curious
            </div>
            <h2 className="text-2xl font-black tracking-tight text-[var(--text-main)]">
              {mode === 'login' ? 'Welcome back' : 'Make room for wonder'}
            </h2>
            <p className="mt-1.5 text-sm text-[var(--text-muted)]">
              {mode === 'login'
                ? 'Sign in to pick up where your curiosity left off.'
                : 'Create an account and find your people.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="auth-username" className="mb-1.5 block text-xs font-semibold">
                    Username
                  </label>
                  <input
                    id="auth-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    minLength={3}
                    maxLength={30}
                    pattern="[A-Za-z0-9_]+"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className={inputClassName}
                    placeholder="e.g. curious_mind"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="auth-display-name" className="mb-1.5 block text-xs font-semibold">
                    Display name
                  </label>
                  <input
                    id="auth-display-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    minLength={2}
                    maxLength={80}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className={inputClassName}
                    placeholder="What should people call you?"
                    required
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="auth-email" className="mb-1.5 block text-xs font-semibold">
                Email
              </label>
              <input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClassName}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="mb-1.5 block text-xs font-semibold">
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={12}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`${inputClassName} pr-12`}
                  placeholder={mode === 'login' ? 'Your password' : 'At least 12 characters'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor="auth-confirm-password" className="mb-1.5 block text-xs font-semibold">
                  Confirm password
                </label>
                <input
                  id="auth-confirm-password"
                  name="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={inputClassName}
                  placeholder="Enter it once more"
                  required
                />
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-700 dark:text-rose-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:-translate-y-0.5 hover:from-violet-700 hover:to-indigo-700 disabled:cursor-wait disabled:opacity-60"
            >
              {isSubmitting
                ? 'Please wait…'
                : mode === 'login'
                  ? 'Sign in'
                  : 'Create your account'}
              {!isSubmitting && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            {mode === 'login' ? 'New to Curio?' : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode((current) => (current === 'login' ? 'register' : 'login'));
                setError(null);
              }}
              className="font-bold text-violet-700 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200"
            >
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>

          <p className="mt-7 border-t border-[var(--border-subtle)] pt-5 text-center text-[11px] leading-5 text-[var(--text-muted)]">
            Password reset and email verification are not configured yet. Existing Curio profiles need an operator to provision or reset their password.
          </p>
        </section>
      </div>
    </main>
  );
}
