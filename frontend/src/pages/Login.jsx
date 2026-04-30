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

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const Login = () => {
  const shellRef = useRef(null);
  const nameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const termsInputRef = useRef(null);
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

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (isRegister && !cleanName) {
      setError('Please enter your name.');
      nameInputRef.current?.focus();
      return;
    }

    if (!cleanEmail) {
      setError('Please enter your email address.');
      emailInputRef.current?.focus();
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setError('Please enter a valid email address.');
      emailInputRef.current?.focus();
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      passwordInputRef.current?.focus();
      return;
    }

    if (isRegister && !passwordHint.isValid) {
      setError(passwordHint.message);
      passwordInputRef.current?.focus();
      return;
    }

    if (isRegister && !agreeToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy.');
      termsInputRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        await register(cleanEmail, password, cleanName);
      } else {
        await login(cleanEmail, password);
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

      <header className="relative z-10 grid min-h-[76px] grid-cols-[1fr_auto] items-center gap-4 px-6 py-4 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-16">
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
            <span className="block text-lg font-black leading-none tracking-[-0.03em] text-[#111827] transition group-hover:tracking-[-0.01em] sm:text-xl">
              HireFlow
            </span>
          </span>
        </button>

        <div className="hidden justify-end sm:flex lg:mx-auto lg:w-full lg:max-w-[520px]">
          <div className="auth-toggle-shell">
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
        </div>
      </header>

      <main className="relative z-10 grid min-h-[calc(100svh-76px)] items-center gap-10 px-6 pb-10 pt-4 sm:px-10 sm:pb-12 lg:grid-cols-[1.05fr_0.95fr] lg:px-16 lg:py-8">
        <section className="hidden w-full max-w-2xl animate-auth-rise lg:block" aria-label="HireFlow overview">
          <p className="mb-4 inline-flex rounded-full border border-[#d7d7d7] bg-white/70 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#4d4a82] shadow-[0_12px_30px_rgba(17,24,39,0.06)] backdrop-blur">
            Premium hiring command center
          </p>
          <h1 className="app-page-title max-w-xl text-4xl text-[#111827] xl:text-5xl">
            Manage hiring in one simple workspace.
          </h1>
          <p className="mt-4 max-w-lg text-sm font-semibold leading-6 text-[#6b7280]">
            Turn screening, ranking, and interview flow into one focused workspace for modern HR teams.
          </p>

          <div className="mt-7 grid max-w-xl gap-1">
            {authHighlights.map((item, index) => (
              <div
                key={item}
                className="group flex items-center justify-between border-b border-[#d7d7d7]/80 py-3 auth-stagger"
                style={{ animationDelay: `${180 + index * 110}ms` }}
              >
                <span className="text-xs font-black uppercase tracking-[0.16em] text-[#777777]">{item}</span>
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

          <div className="mt-7 flex items-end gap-5">
            <div className="relative h-28 w-28 overflow-hidden rounded-xl bg-[#111827] shadow-[0_30px_80px_rgba(17,24,39,0.22)]">
              <div className="absolute inset-x-5 top-6 h-2 rounded-full bg-white/70" />
              <div className="absolute left-5 top-12 h-12 w-3 rounded-full bg-white/25" />
              <div className="absolute left-12 right-5 top-12 grid gap-2">
                <div className="h-2 rounded-full bg-white/55" />
                <div className="h-2 w-4/5 rounded-full bg-white/35" />
                <div className="h-2 w-3/5 rounded-full bg-white/25" />
              </div>
              <div className="auth-pulse-soft absolute bottom-5 right-5 h-4 w-4 rounded-full bg-white/90 shadow-[0_0_0_6px_rgba(255,255,255,0.14)]" />
            </div>
            <div className="pb-2">
              <p className="text-3xl font-black tracking-[-0.04em] text-[#111827]">2.4x</p>
              <p className="mt-1 max-w-44 text-xs font-bold leading-5 text-[#777777]">
                faster shortlist review with guided workflow states.
              </p>
            </div>
          </div>
        </section>

        <section
          className="relative mx-auto w-full max-w-[500px] overflow-hidden rounded-xl border border-white/80 bg-white/78 px-6 py-7 shadow-[0_32px_90px_rgba(17,24,39,0.14)] backdrop-blur-2xl animate-auth-rise sm:px-9 sm:py-8"
          aria-labelledby="auth-title"
        >
          <div className="pointer-events-none absolute inset-x-5 top-0 h-[2px] overflow-hidden rounded-full bg-[#111827]/8" aria-hidden="true">
            <div className="h-full w-40 rounded-full bg-gradient-to-r from-transparent via-[#111827]/80 to-transparent auth-sheen" />
          </div>
          <div key={mode} className="auth-mode-panel">
            <div className="mb-4 text-center">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#4d4a82]">
                {isRegister ? 'Start your workspace' : 'Welcome back'}
              </p>
              <h2 id="auth-title" className="app-section-title text-2xl text-[#191919] sm:text-3xl">
                {isRegister ? 'Create account' : 'Log in to HireFlow'}
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-xs font-semibold leading-5 text-[#777777] sm:text-sm">
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

            <form onSubmit={handleSubmit} noValidate className="grid gap-2.5">
              {isRegister && (
                <label className="group grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#6a6a6a]">
                  <span>Name</span>
                  <input
                    ref={nameInputRef}
                    className="min-h-11 w-full rounded-lg border border-[#d2d2d2] bg-white/90 px-4 text-sm !font-normal normal-case tracking-normal text-[#2f2f2f] outline-none transition duration-300 placeholder:!font-normal placeholder:text-[#9b9b9b] focus:-translate-y-0.5 focus:border-[#111827] focus:bg-white focus:shadow-[0_16px_40px_rgba(17,24,39,0.10)] focus:ring-4 focus:ring-[#111827]/10"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-required="true"
                    placeholder="Alex Rivera"
                    autoComplete="name"
                  />
                </label>
              )}

              <label className="group grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#6a6a6a]">
                <span>Email address</span>
                <input
                  ref={emailInputRef}
                  className="min-h-11 w-full rounded-lg border border-[#d2d2d2] bg-white/90 px-4 text-sm !font-normal normal-case tracking-normal text-[#2f2f2f] outline-none transition duration-300 placeholder:!font-normal placeholder:text-[#9b9b9b] focus:-translate-y-0.5 focus:border-[#111827] focus:bg-white focus:shadow-[0_16px_40px_rgba(17,24,39,0.10)] focus:ring-4 focus:ring-[#111827]/10"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-required="true"
                  placeholder="name@company.com"
                  autoComplete="email"
                />
              </label>

              <label className="group grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#6a6a6a]">
                <span>Password</span>
                <input
                  ref={passwordInputRef}
                  className="min-h-11 w-full rounded-lg border border-[#d2d2d2] bg-white/90 px-4 text-sm !font-normal normal-case tracking-normal text-[#2f2f2f] outline-none transition duration-300 placeholder:!font-normal placeholder:text-[#9b9b9b] focus:-translate-y-0.5 focus:border-[#111827] focus:bg-white focus:shadow-[0_16px_40px_rgba(17,24,39,0.10)] focus:ring-4 focus:ring-[#111827]/10"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-required="true"
                  placeholder="Password"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
              </label>

              {isRegister && (
                <>
                  <p className={`-mt-0.5 text-xs font-medium ${passwordHint.isValid ? 'text-emerald-600' : 'text-[#8a8a8a]'}`}>
                    8+ characters and one special symbol
                  </p>

                  <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-xs font-medium leading-relaxed text-[#777777] transition duration-200 hover:text-[#111827]">
                    <input
                      ref={termsInputRef}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-[#cfcfcf] accent-black"
                      type="checkbox"
                      checked={agreeToTerms}
                      onChange={(e) => setAgreeToTerms(e.target.checked)}
                      aria-required="true"
                    />
                    <span>
                      I agree to the{' '}
                      <a className="font-semibold text-[#4d4a82]" href="#">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a className="font-semibold text-[#4d4a82]" href="#">
                        Privacy Policy
                      </a>
                      .
                    </span>
                  </label>
                </>
              )}

              {!isRegister && (
                <div className="flex items-center justify-between gap-4">
                  <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-medium text-[#777777] transition duration-200 hover:text-[#111827]">
                    <input className="h-4 w-4 cursor-pointer accent-black" type="checkbox" />
                    <span>Remember Me</span>
                  </label>
                  <button
                    type="button"
                    className="shrink-0 cursor-pointer text-xs font-black tracking-normal text-[#4d4a82] underline decoration-transparent underline-offset-4 transition duration-200 hover:-translate-y-0.5 hover:text-[#111827] hover:decoration-[#111827]/35"
                  >
                    Forgot Password
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="group relative mt-1 inline-flex min-h-12 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border-0 bg-[#111827] text-sm font-black tracking-[0.03em] text-white shadow-[0_10px_22px_rgba(17,24,39,0.14)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#171717] hover:shadow-[0_14px_28px_rgba(17,24,39,0.18)] active:translate-y-0 active:scale-[0.985] disabled:cursor-wait disabled:opacity-70"
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

            <div className="my-3 flex items-center gap-3 text-center text-[11px] font-black tracking-[0.14em] text-[#8a8a8a] before:h-px before:flex-1 before:bg-[#dedede] after:h-px after:flex-1 after:bg-[#dedede]">
              <span>OR CONTINUE WITH</span>
            </div>

            <button
              type="button"
              className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-[#d4d4d4] bg-white/90 text-sm font-black tracking-[0.03em] text-[#2a2a2a] shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[#111827]/30 hover:bg-white hover:shadow-[0_16px_38px_rgba(17,24,39,0.10)] active:translate-y-0 active:scale-[0.985] disabled:cursor-wait disabled:opacity-70"
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

            <p className="mt-5 text-center text-sm font-bold text-[#777777] sm:hidden">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                className="font-black tracking-normal text-[#171717] underline decoration-[#171717]/20 underline-offset-4 transition hover:decoration-[#171717]"
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
