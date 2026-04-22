import React, { useEffect, useState } from 'react';
import SharedLayout from './components/SharedLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
const AUTH_URL = `${API_BASE}/api/v1/auth`;

const pageShell = 'flex min-h-screen flex-col bg-neutral-50 text-neutral-950';
const topbar = 'sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4 sm:px-8';
const brand = 'text-xl font-black tracking-tight';
const topActions = 'flex items-center gap-3';
const linkButton = 'cursor-pointer border-0 bg-transparent p-0 text-sm font-medium text-neutral-700 transition hover:text-neutral-950';
const darkButton = 'inline-flex min-h-11 items-center justify-center rounded-lg bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400';
const outlineButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-950 transition hover:border-neutral-950 disabled:cursor-not-allowed disabled:opacity-60';
const contentArea = 'flex flex-1 items-center justify-center px-5 py-10 sm:px-8';
const card = 'w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm sm:p-8';
const cardHeader = 'mb-8 text-center';
const formGrid = 'grid gap-4';
const labelClass = 'grid gap-2 text-sm font-medium text-neutral-800';
const inputClass = 'min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10';
const alertBase = 'mb-5 rounded-lg border px-4 py-3 text-sm';
const footer = 'flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-white px-5 py-5 text-sm text-neutral-500 sm:px-8';
const footerLinks = 'flex flex-wrap items-center gap-4';

const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.7 3-4.2 3-7.3z" />
    <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5L15.4 17c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6C4.7 19.7 8.1 22 12 22z" />
    <path fill="#FBBC05" d="M6.4 13.8c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V7.6H3.1C2.4 8.9 2 10.4 2 12s.4 3.1 1.1 4.4l3.3-2.6z" />
    <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9C16.9 3 14.7 2 12 2 8.1 2 4.7 4.3 3.1 7.6l3.3 2.6c.8-2.3 3-4.1 5.6-4.1z" />
  </svg>
);

const HRSignUp = () => {
  const [mode, setMode] = useState('signup');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    jobTitle: '',
    agreeToTerms: false,
    rememberMe: false
  });
  const [forgotEmail, setForgotEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hireflow_token');
    const rememberEmail = localStorage.getItem('hireflow_remember_email');
    const rememberName = localStorage.getItem('hireflow_remember_name');

    if (rememberEmail) {
      setFormData(prev => ({
        ...prev,
        email: rememberEmail,
        fullName: rememberName || '',
        rememberMe: true
      }));
      setMode('login');
    }

    if (token) {
      fetch(`${AUTH_URL}/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then(async (response) => {
          if (response.ok) {
            const result = await response.json();
            setUser(result.data);
          } else {
            localStorage.removeItem('hireflow_token');
          }
        })
        .catch(() => {
          localStorage.removeItem('hireflow_token');
        })
        .finally(() => {
          setInitializing(false);
        });
    } else {
      setInitializing(false);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/api/v1/auth/google`;
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    resetMessages();

    if (!forgotEmail) {
      return setError('Please enter your email address.');
    }

    setLoading(true);
    try {
      const response = await fetch(`${AUTH_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });

      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to send reset email.');
      }

      setSuccess('If an account exists with this email, you will receive a password reset link.');
      setForgotEmail('');
      setTimeout(() => {
        setShowForgotPassword(false);
        resetMessages();
      }, 3000);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetMessages();

    const { fullName, email, password, confirmPassword, agreeToTerms, rememberMe } = formData;
    if (!email || !password) {
      return setError('Email and password are required.');
    }

    if (mode === 'signup') {
      if (!fullName) {
        return setError('Full name is required for registration.');
      }
      if (password !== confirmPassword) {
        return setError('Passwords do not match.');
      }
      if (!agreeToTerms) {
        return setError('You must agree to the terms to create an account.');
      }
    }

    setLoading(true);
    try {
      const payload = { email, password };
      const endpoint = mode === 'signup' ? '/register' : '/login';
      if (mode === 'signup') {
        payload.name = fullName;
      }

      const response = await fetch(`${AUTH_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error?.message || 'Authentication failed.');
      }

      if (rememberMe && mode === 'login') {
        localStorage.setItem('hireflow_remember_email', email);
        localStorage.setItem('hireflow_remember_name', result.data.user.name || '');
      } else if (!rememberMe) {
        localStorage.removeItem('hireflow_remember_email');
        localStorage.removeItem('hireflow_remember_name');
      }

      localStorage.setItem('hireflow_token', result.data.token);
      setUser(result.data.user);
      setSuccess(mode === 'signup' ? 'Account created successfully!' : 'Logged in successfully!');
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = (newMode) => {
    resetMessages();
    setMode(newMode);
    setShowForgotPassword(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('hireflow_token');
    setUser(null);
    setFormData({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      companyName: '',
      jobTitle: '',
      agreeToTerms: false,
      rememberMe: false
    });
    setSuccess('You have been logged out.');
  };

  const renderAlert = (message, type) => {
    if (!message) return null;

    const tone = type === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';

    return <div className={`${alertBase} ${tone}`}>{message}</div>;
  };


  const renderWorkspacePage = () => (
    <SharedLayout
      user={user}
      activePage={currentPage}
      onNavigate={setCurrentPage}
      onLogout={handleLogout}
    >
      {currentPage === 'dashboard' ? (
        <Dashboard />
      ) : (
        <section className="dashboard-page placeholder-page">
          <div className="dashboard-header">
            <div>
              <p className="eyebrow">{currentPage === 'positions' ? 'Job Positions' : currentPage === 'candidates' ? 'Candidates' : currentPage === 'workflow' ? 'Workflow' : 'Settings'}</p>
              <h1>{currentPage === 'positions' ? 'Job Positions' : currentPage === 'candidates' ? 'Candidate pipeline' : currentPage === 'workflow' ? 'Workflow overview' : 'Settings'}</h1>
              <p className="dashboard-copy">This workspace page is part of the HireFlow shared layout and will reuse the header and sidebar across every screen.</p>
            </div>
          </div>
        </section>
      )}
    </SharedLayout>
  );

  if (initializing) {
    return (
      <div className={pageShell}>
        <main className={contentArea}>
          <section className={card}>
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Loading HireFlow...</h1>
              <p className="mt-2 text-sm text-neutral-500">Checking your session.</p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (user) {
    return renderWorkspacePage();
  }

  if (showForgotPassword) {
    return (
      <div className={pageShell}>
        <header className={topbar}>
          <div className={brand}>HireFlow</div>
          <div className={topActions}>
            <button type="button" className={linkButton} onClick={() => setShowForgotPassword(false)}>
              Back to Login
            </button>
          </div>
        </header>

        <main className={contentArea}>
          <section className={card}>
            <div className={cardHeader}>
              <h1 className="text-3xl font-semibold tracking-tight">Reset your password</h1>
              <p className="mt-3 text-sm leading-6 text-neutral-500">Enter your email address and we'll send you a password reset link.</p>
            </div>

            {renderAlert(error, 'error')}
            {renderAlert(success, 'success')}

            <form className={formGrid} onSubmit={handleForgotPassword}>
              <label className={labelClass}>
                Work Email
                <input
                  className={inputClass}
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </label>

              <button type="submit" className={darkButton} disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-neutral-500">
              Remember your password?{' '}
              <button
                type="button"
                className={linkButton}
                onClick={() => setShowForgotPassword(false)}
              >
                Back to Login
              </button>
            </p>
          </section>
        </main>


      </div>
    );
  }

  return (
    <div className={pageShell}>
      <header className={topbar}>
        <div className={brand}>HireFlow</div>
        <div className={topActions}>
        </div>
      </header>

      <main className={contentArea}>
        <section className={card}>
          <div className={cardHeader}>
            <h1 className="text-3xl font-semibold tracking-tight">{mode === 'signup' ? 'Create account' : 'Login'}</h1>
            <p className="mt-3 text-sm leading-6 text-neutral-500">{mode === 'signup' ? 'Start optimizing your hiring workflow today.' : 'Login with your email and password.'}</p>
          </div>

          {renderAlert(error, 'error')}
          {renderAlert(success, 'success')}

          <form className={formGrid} onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label className={labelClass}>
                Full Name
                <input
                  className={inputClass}
                  type="text"
                  name="fullName"
                  placeholder="Alex Rivera"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </label>
            )}

            <label className={labelClass}>
              Work Email
              <input
                className={inputClass}
                type="email"
                name="email"
                placeholder="name@company.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </label>

            <label className={labelClass}>
              Password
              <input
                className={inputClass}
                type="password"
                name="password"
                placeholder="********"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </label>

            {mode === 'login' && (
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600">
                  <input
                    className="h-4 w-4 rounded border-neutral-300 text-neutral-950 focus:ring-neutral-950"
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  className={linkButton}
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {mode === 'signup' && (
              <>
                <label className={labelClass}>
                  Confirm Password
                  <input
                    className={inputClass}
                    type="password"
                    name="confirmPassword"
                    placeholder="********"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className={labelClass}>
                  Company Name
                  <input
                    className={inputClass}
                    type="text"
                    name="companyName"
                    placeholder="HireFlow Inc."
                    value={formData.companyName}
                    onChange={handleChange}
                  />
                </label>

                <label className={labelClass}>
                  Job Title
                  <input
                    className={inputClass}
                    type="text"
                    name="jobTitle"
                    placeholder="Talent Partner"
                    value={formData.jobTitle}
                    onChange={handleChange}
                  />
                </label>

                <label className="flex items-start gap-3 text-sm leading-6 text-neutral-600">
                  <input
                    className="mt-1 h-4 w-4 rounded border-neutral-300 text-neutral-950 focus:ring-neutral-950"
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleChange}
                    required
                  />
                  <span>
                    I agree to the <a className="font-medium text-neutral-950 underline underline-offset-4" href="#">Terms of Service</a> and <a className="font-medium text-neutral-950 underline underline-offset-4" href="#">Privacy Policy</a>.
                  </span>
                </label>
              </>
            )}

            <button type="submit" className={darkButton} disabled={loading}>
              {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Log in'}
            </button>

            <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-widest text-neutral-400">
              <span className="h-px flex-1 bg-neutral-200" />
              <span>Or {mode === 'signup' ? 'join' : 'log in'} with</span>
              <span className="h-px flex-1 bg-neutral-200" />
            </div>

            <button type="button" className={outlineButton} onClick={handleGoogleLogin}>
              <GoogleIcon />
              Google
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500">
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button type="button" className={linkButton} onClick={() => handleModeSwitch(mode === 'signup' ? 'login' : 'signup')}>
              {mode === 'signup' ? 'Log In' : 'Sign Up'}
            </button>
          </p>
        </section>
      </main>

    
    </div>
  );
};

export default HRSignUp;
