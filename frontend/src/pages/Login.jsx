import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import api from '../services/api';
import { authButtonTextClassName } from '../styles/buttonStyles';

const getPasswordHint = (value) => {
  const hasMinLength = value.length >= 8;
  const hasSpecialSymbol = /[^A-Za-z0-9]/.test(value);
  const isValid = hasMinLength && hasSpecialSymbol;

  return {
    isValid,
    message: isValid
      ? 'Password meets the requirements.'
      : 'Must be at least 8 characters with one special symbol.',
  };
};

const authHighlights = [
  'AI-assisted candidate screening',
  'Interview workflow automation',
  'Secure HR workspace',
];

const Login = () => {
  const shellRef = useRef(null);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const passwordHint = getPasswordHint(password);
  const mode = isRegister ? 'register' : 'login';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isRegister && !passwordHint.isValid) {
      setError(passwordHint.message);
      return;
    }

    if (isRegister && !agreeToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setError('');
    setGoogleLoading(true);
    api.auth.google();
  };

  const switchMode = (nextMode) => {
    setIsRegister(nextMode === 'register');
    setError('');
    setPassword('');
    setAgreeToTerms(false);
  };

  const passwordChecks = [
    { label: '8+ characters', active: password.length >= 8 },
    { label: 'Special symbol', active: /[^A-Za-z0-9]/.test(password) },
  ];

  const handlePointerMove = (event) => {
    const node = shellRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    node.style.setProperty('--auth-cursor-x', `${x}px`);
    node.style.setProperty('--auth-cursor-y', `${y}px`);
    node.style.setProperty('--auth-grid-active', '1');
  };

  const handlePointerLeave = () => {
    const node = shellRef.current;
    if (!node) return;

    node.style.setProperty('--auth-grid-active', '0');
  };

  return (
    <div
      ref={shellRef}
      className="relative min-h-screen overflow-hidden bg-[#f2f3f5] text-[#121212]"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="pointer-events-none absolute inset-0 auth-grid opacity-80" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 auth-grid-spotlight" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-[#111827]/10 blur-3xl auth-float"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-12 h-80 w-80 rounded-full bg-[#4d4a82]/15 blur-3xl auth-float-delayed"
        aria-hidden="true"
      />

      <header className="relative z-10 flex min-h-20 items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <button
          type="button"
          className="group inline-flex items-center gap-3 text-left"
          onClick={() => navigate('/login')}
          aria-label="HireFlow home"
        >
          <span className="auth-logo-mark relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-black text-white shadow-[0_18px_40px_rgba(17,24,39,0.18)] transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_22px_48px_rgba(17,24,39,0.26)]">
            <span className="pointer-events-none absolute inset-0 auth-logo-glow" aria-hidden="true" />
            <svg viewBox="0 0 20 20" className="relative h-5 w-5 transition duration-300 group-hover:scale-105" aria-hidden="true">
              <path fill="currentColor" d="M4 4h5v5H4V4Zm7 0h5v5h-5V4ZM4 11h5v5H4v-5Zm7 0h5v5h-5v-5Z" />
            </svg>
          </span>
          <span>
            <span className="block text-xl font-black leading-none tracking-[-0.04em] text-[#111827] transition group-hover:tracking-[-0.02em]">
              HireFlow
            </span>
          </span>
        </button>

        <div className="auth-toggle-shell hidden sm:flex">
          <span className={`auth-toggle-indicator ${isRegister ? 'is-register' : 'is-login'}`} aria-hidden="true" />
          <button
            type="button"
            className={`auth-toggle-button ${authButtonTextClassName} ${!isRegister ? 'is-active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Log In
          </button>
          <button
            type="button"
            className={`auth-toggle-button ${authButtonTextClassName} ${isRegister ? 'is-active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Sign Up
          </button>
        </div>
      </header>

      <main className="relative z-10 grid min-h-[calc(100svh-96px)] items-center gap-10 px-5 pb-10 pt-4 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:pb-12">
        <section className="mx-auto hidden w-full max-w-2xl animate-auth-rise lg:block" aria-label="HireFlow overview">
          <p className="mb-5 inline-flex rounded-full border border-[#d7d7d7] bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#4d4a82] shadow-[0_12px_30px_rgba(17,24,39,0.06)] backdrop-blur">
            Premium hiring command center
          </p>
          <h1 className="max-w-xl text-6xl font-black leading-[1.02] tracking-[-0.035em] text-[#111827] xl:text-7xl">
            Manage hiring in one simple workspace.
          </h1>
          <p className="mt-6 max-w-lg text-lg font-semibold leading-8 text-[#6b7280]">
            Turn screening, ranking, and interview flow into one focused workspace for modern HR teams.
          </p>

          <div className="mt-10 grid max-w-xl gap-3">
            {authHighlights.map((item, index) => (
              <div
                key={item}
                className="group flex items-center justify-between border-b border-[#d7d7d7]/80 py-5 auth-stagger"
                style={{ animationDelay: `${180 + index * 110}ms` }}
              >
                <span className="text-sm font-black uppercase tracking-[0.18em] text-[#777777]">{item}</span>
                <span
                  className="pointer-events-none inline-flex items-center gap-2 text-[#9a9a9a] transition duration-300 group-hover:translate-x-1 group-hover:text-[#111827]"
                  aria-hidden="true"
                >
                  <span className="h-px w-8 bg-current opacity-45 transition duration-300 group-hover:w-10 group-hover:opacity-80" />
                  <span className="text-base leading-none">↗</span>
                </span>
              </div>
            ))}
          </div>

          <div className="mt-12 flex items-end gap-5">
            <div className="relative h-32 w-32 overflow-hidden rounded-xl bg-[#111827] shadow-[0_30px_80px_rgba(17,24,39,0.22)]">
              <div className="absolute inset-x-5 top-6 h-2 rounded-full bg-white/70" />
              <div className="absolute inset-x-5 top-12 h-2 rounded-full bg-white/35" />
              <div className="absolute bottom-5 left-5 h-11 w-11 rounded-lg bg-white/90 auth-pulse-soft" />
              <div className="absolute bottom-5 right-5 h-11 w-11 rounded-lg border border-white/35" />
            </div>
            <div className="pb-2">
              <p className="text-4xl font-black tracking-[-0.06em] text-[#111827]">2.4x</p>
              <p className="mt-1 max-w-44 text-sm font-bold leading-6 text-[#777777]">
                faster shortlist review with guided workflow states.
              </p>
            </div>
          </div>
        </section>

        <section
          className="relative mx-auto w-full max-w-[480px] overflow-hidden rounded-xl border border-white/80 bg-white/78 px-6 py-7 shadow-[0_32px_90px_rgba(17,24,39,0.14)] backdrop-blur-2xl animate-auth-rise sm:px-8 sm:py-9"
          aria-labelledby="auth-title"
        >
          <div className="pointer-events-none absolute inset-x-5 top-0 h-[2px] overflow-hidden rounded-full bg-[#111827]/8" aria-hidden="true">
            <div className="h-full w-40 rounded-full bg-gradient-to-r from-transparent via-[#111827]/80 to-transparent auth-sheen" />
          </div>
          <div key={mode} className="auth-mode-panel">
            <div className="mb-6 text-center">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-[#4d4a82]">
                {isRegister ? 'Start your workspace' : 'Welcome back'}
              </p>
              <h2 id="auth-title" className="text-4xl font-black leading-tight tracking-[-0.06em] text-[#191919]">
                {isRegister ? 'Create account' : 'Log in to HireFlow'}
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-6 text-[#777777]">
                {isRegister
                  ? 'Create your HR command center and start moving candidates with clarity.'
                  : 'Continue screening, ranking, and managing interviews from one workspace.'}
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800 animate-auth-pop">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid gap-4">
              {isRegister && (
                <label className="group grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#6a6a6a]">
                  <span>Name</span>
                  <input
                    className="min-h-[54px] w-full rounded-lg border border-[#d2d2d2] bg-white/90 px-4 text-base font-semibold normal-case tracking-normal text-[#171717] outline-none transition duration-300 placeholder:text-[#9b9b9b] focus:-translate-y-0.5 focus:border-[#111827] focus:bg-white focus:shadow-[0_16px_40px_rgba(17,24,39,0.10)] focus:ring-4 focus:ring-[#111827]/10"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Alex Rivera"
                    autoComplete="name"
                  />
                </label>
              )}

              <label className="group grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#6a6a6a]">
                <span>Email address</span>
                <input
                  className="min-h-[54px] w-full rounded-lg border border-[#d2d2d2] bg-white/90 px-4 text-base font-semibold normal-case tracking-normal text-[#171717] outline-none transition duration-300 placeholder:text-[#9b9b9b] focus:-translate-y-0.5 focus:border-[#111827] focus:bg-white focus:shadow-[0_16px_40px_rgba(17,24,39,0.10)] focus:ring-4 focus:ring-[#111827]/10"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@company.com"
                  autoComplete="email"
                />
              </label>

              <label className="group grid gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#6a6a6a]">
                <span>Password</span>
                <input
                  className="min-h-[54px] w-full rounded-lg border border-[#d2d2d2] bg-white/90 px-4 text-base font-semibold normal-case tracking-normal text-[#171717] outline-none transition duration-300 placeholder:text-[#9b9b9b] focus:-translate-y-0.5 focus:border-[#111827] focus:bg-white focus:shadow-[0_16px_40px_rgba(17,24,39,0.10)] focus:ring-4 focus:ring-[#111827]/10"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Password"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
              </label>

              {isRegister && (
                <>
                  <div className="-mt-1 flex flex-wrap gap-2">
                    {passwordChecks.map((check) => (
                      <span
                        key={check.label}
                        className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                          check.active
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-[#dedede] bg-white text-[#8a8a8a]'
                        }`}
                      >
                        {check.label}
                      </span>
                    ))}
                  </div>

                  <p className={`text-sm font-bold ${passwordHint.isValid ? 'text-emerald-600' : 'text-[#8a8a8a]'}`}>
                    {passwordHint.message}
                  </p>

                  <label className="flex items-start gap-3 rounded-lg border border-[#ececec] bg-[#f8f8f8]/70 px-4 py-3 text-xs font-semibold leading-relaxed text-[#777777]">
                    <input
                      className="mt-0.5 h-5 w-5 shrink-0 rounded border-[#cfcfcf] accent-black"
                      type="checkbox"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      required
                    />
                    <span>
                      I agree to the{' '}
                      <a className="font-black text-[#273b72]" href="#">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a className="font-black text-[#273b72]" href="#">
                        Privacy Policy
                      </a>
                      .
                    </span>
                  </label>
                </>
              )}

              {!isRegister && (
                <div className="flex items-center justify-between gap-4">
                  <label className="inline-flex items-center gap-2.5 text-sm font-bold text-[#777777]">
                    <input className="h-4 w-4 accent-black" type="checkbox" />
                    <span>Remember Me</span>
                  </label>
                  <button
                    type="button"
                    className="shrink-0 text-xs font-semibold tracking-[-0.01em] text-[#4d4a82] transition hover:text-[#111827]"
                  >
                    Forgot Password
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="group relative mt-1 inline-flex min-h-14 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border-0 bg-[#111827] text-sm font-semibold uppercase tracking-[0.08em] text-white shadow-[0_22px_45px_rgba(17,24,39,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#171717] hover:shadow-[0_28px_60px_rgba(17,24,39,0.28)] active:translate-y-0 active:scale-[0.985] disabled:cursor-wait disabled:opacity-70"
                disabled={loading}
                aria-busy={loading}
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition duration-700 group-hover:translate-x-full" />
                <span className="relative inline-flex items-center gap-2">
                  {loading && (
                    <span
                      className="h-4 w-4 rounded-full border-2 border-white/35 border-t-white auth-spin"
                      aria-hidden="true"
                    />
                  )}
                  {loading ? 'Please wait...' : isRegister ? 'Sign Up' : 'Log In'}
                </span>
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-center text-xs font-black tracking-[0.16em] text-[#8a8a8a] before:h-px before:flex-1 before:bg-[#dedede] after:h-px after:flex-1 after:bg-[#dedede]">
              <span>OR CONTINUE WITH</span>
            </div>

            <button
              type="button"
              className="inline-flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-[#d4d4d4] bg-white/90 text-sm font-semibold tracking-[-0.01em] text-[#2a2a2a] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[#111827]/30 hover:bg-white hover:shadow-[0_16px_38px_rgba(17,24,39,0.10)] active:translate-y-0 active:scale-[0.985] disabled:cursor-wait disabled:opacity-70"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              aria-busy={googleLoading}
            >
              {googleLoading ? (
                <span className="h-4 w-4 rounded-full border-2 border-[#111827]/20 border-t-[#111827] auth-spin" aria-hidden="true" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 18 18" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.35 0-4.34-1.59-5.05-3.72H.93v2.33A9 9 0 0 0 9 18z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.93A9 9 0 0 0 0 9c0 1.45.34 2.82.93 4.03l3.02-2.33z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .93 4.97L3.95 7.3C4.66 5.17 6.65 3.58 9 3.58z"
                  />
                </svg>
              )}
              {googleLoading ? 'Connecting...' : 'Google'}
            </button>

            <p className="mt-6 text-center text-sm font-bold text-[#777777]">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                className="font-semibold tracking-[-0.01em] text-[#171717] underline decoration-[#171717]/20 underline-offset-4 transition hover:decoration-[#171717]"
                onClick={() => switchMode(isRegister ? 'login' : 'register')}
              >
                {isRegister ? 'Log In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Login;
