import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import api from '../services/api';

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

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const passwordHint = getPasswordHint(password);

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

  const switchMode = (nextMode) => {
    setIsRegister(nextMode === 'register');
    setError('');
    setPassword('');
    setAgreeToTerms(false);
  };

  return (
    <div className="min-h-screen text-[#121212]">
      <header className="flex h-18 items-center border-b border-[#ececec] bg-white px-5">
        <div className="text-xl font-extrabold leading-none tracking-normal">HireFlow</div>
      </header>

      <main className="flex min-h-[calc(100vh-48px)] flex-col items-center px-5 pb-10 pt-20">
        <section
          className="w-full max-w-[440px] rounded-md border border-[#d7d7d7] bg-white px-6 py-9 sm:px-9"
          aria-labelledby="auth-title"
        >
          <div className="mb-6 text-center">
            <h1 id="auth-title" className="text-3xl font-extrabold leading-tight tracking-normal text-[#191919]">
              {isRegister ? 'Create account' : 'Welcome back'}
            </h1>
            <p className="mt-2 text-sm font-semibold text-[#777777]">
              {isRegister ? 'Please enter your details to sign up.' : 'Please enter your details to sign in.'}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-semibold text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid gap-4">
            {isRegister && (
              <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.04em] text-[#6a6a6a]">
                <span>Name</span>
                <input
                  className="min-h-[42px] w-full rounded-md border border-[#d2d2d2] bg-white px-3.5 text-base font-medium normal-case tracking-normal text-[#171717] outline-none transition focus:border-[#111111] focus:ring-2 focus:ring-[#111111]/10"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Alex Rivera"
                  autoComplete="name"
                />
              </label>
            )}

            <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.04em] text-[#6a6a6a]">
              <span>Email address</span>
              <input
                className="min-h-[42px] w-full rounded-md border border-[#d2d2d2] bg-white px-3.5 text-base font-medium normal-case tracking-normal text-[#171717] outline-none transition placeholder:text-[#9b9b9b] focus:border-[#111111] focus:ring-2 focus:ring-[#111111]/10"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@company.com"
                autoComplete="email"
              />
            </label>

            <label className="grid gap-2 text-xs font-extrabold uppercase tracking-[0.04em] text-[#6a6a6a]">
              <span>Password</span>
              <input
                className="min-h-[42px] w-full rounded-md border border-[#d2d2d2] bg-white px-3.5 text-base font-medium normal-case tracking-normal text-[#171717] outline-none transition placeholder:text-[#9b9b9b] focus:border-[#111111] focus:ring-2 focus:ring-[#111111]/10"
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
                <p
                  className={`-mt-2 text-sm font-semibold ${
                    passwordHint.isValid ? 'text-emerald-600' : 'text-[#8a8a8a]'
                  }`}
                >
                  {passwordHint.message}
                </p>

                <label className="flex items-start gap-3 pt-3 text-xs font-semibold leading-relaxed text-[#777777]">
                  <input
                    className="mt-1 h-5 w-5 shrink-0 rounded border-[#cfcfcf] accent-black"
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    required
                  />
                  <span>
                    I agree to the{' '}
                    <a className="font-extrabold text-[#273b72]" href="#">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a className="font-extrabold text-[#273b72]" href="#">
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
                  className="shrink-0 text-xs font-extrabold normal-case tracking-normal text-[#4d4a82]"
                >
                  Forgot Password
                </button>
              </div>
            )}

            <button
              type="submit"
              className="mt-1 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md border-0 bg-black text-sm font-extrabold text-white transition hover:bg-[#171717] disabled:cursor-wait disabled:opacity-70"
              disabled={loading}
            >
              {loading ? 'Please wait...' : isRegister ? 'Sign Up' : 'Log In'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-center text-xs font-extrabold tracking-[0.16em] text-[#8a8a8a] before:h-px before:flex-1 before:bg-[#dedede] after:h-px after:flex-1 after:bg-[#dedede]">
            <span>OR CONTINUE WITH</span>
          </div>

          <button
            type="button"
            className="inline-flex min-h-[42px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-md border border-[#d4d4d4] bg-white text-sm font-extrabold text-[#2a2a2a] transition hover:bg-[#f8f8f8]"
            onClick={() => api.auth.google()}
          >
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
            Google
          </button>
        </section>

        <p className="mt-6 text-center text-sm font-semibold text-[#777777]">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            className="font-extrabold text-[#171717]"
            onClick={() => switchMode(isRegister ? 'login' : 'register')}
          >
            {isRegister ? 'Log In' : 'Sign Up'}
          </button>
        </p>
      </main>
    </div>
  );
};

export default Login;
