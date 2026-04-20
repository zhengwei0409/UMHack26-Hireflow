import React, { useState, useEffect } from 'react';
import SharedLayout from './components/SharedLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CreateJob from './pages/CreateJob.jsx';
import './styles/signup.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
const AUTH_URL = `${API_BASE}/api/v1/auth`;

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

  // Check for existing token and remember me data on app load
  useEffect(() => {
    const token = localStorage.getItem('hireflow_token');
    const rememberEmail = localStorage.getItem('hireflow_remember_email');
    const rememberName = localStorage.getItem('hireflow_remember_name');

    // Pre-fill form with remember me data
    if (rememberEmail) {
      setFormData(prev => ({
        ...prev,
        email: rememberEmail,
        fullName: rememberName || '',
        rememberMe: true
      }));
      setMode('login'); // Switch to login mode if we have remember me data
    }

    // Validate existing token
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
            // Token is invalid, remove it
            localStorage.removeItem('hireflow_token');
          }
        })
        .catch(() => {
          // Network error or other issue, remove token
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
    // Redirect to backend's Google OAuth endpoint
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
      // In a real app, you'd have a backend endpoint for this
      // For now, we'll simulate it
      const response = await fetch(`${AUTH_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });

      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to send reset email.');
      }

      // Always show success message for security (don't reveal if email exists)
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

      // Handle remember me
      if (rememberMe && mode === 'login') {
        localStorage.setItem('hireflow_remember_email', email);
        localStorage.setItem('hireflow_remember_name', result.data.user.name || '');
      } else if (!rememberMe) {
        // Clear remember me data if unchecked
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
    // Keep remember me data for future logins
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

  // Show loading while checking for existing session
  if (initializing) {
    return (
      <div className="page-shell">
        <main className="content-area">
          <section className="signup-card">
            <div className="card-header">
              <h1>Loading HireFlow...</h1>
              <p>Checking your session.</p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (user) {
    return (
      <SharedLayout
        user={user}
        activePage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
      >
        {currentPage === 'dashboard' ? (
          <Dashboard onCreateJob={() => setCurrentPage('positions')} />
        ) : currentPage === 'positions' ? (
          <CreateJob />
        ) : (
          <section className="dashboard-page placeholder-page">
            <div className="dashboard-header">
              <div>
                <p className="eyebrow">{currentPage === 'positions' ? 'Job Positions' : currentPage === 'candidates' ? 'Candidates' : currentPage === 'shortlisted' ? 'Shortlisted' : 'Settings'}</p>
                <h1>{currentPage === 'positions' ? 'Job Positions' : currentPage === 'candidates' ? 'Candidate pipeline' : currentPage === 'shortlisted' ? 'Shortlisted candidates' : 'Settings'} </h1>
                <p className="dashboard-copy">This workspace page is part of the HireFlow shared layout and will reuse the header and sidebar across every screen.</p>
              </div>
            </div>
          </section>
        )}
      </SharedLayout>
    );
  }

  // Forgot password modal
  if (showForgotPassword && !user) {
    return (
      <div className="page-shell">
        <header className="topbar">
          <div className="brand">HireFlow</div>
          <div className="top-actions">
            <a type="button" className="login-link" onClick={() => setShowForgotPassword(false)}>
              Back to Login
            </a>
          </div>
        </header>

        <main className="content-area">
          <section className="signup-card">
            <div className="card-header">
              <h1>Reset Your Password</h1>
              <p>Enter your email address and we'll send you a password reset link.</p>
            </div>

            {error && <div className="form-alert error">{error}</div>}
            {success && <div className="form-alert success">{success}</div>}

            <form className="signup-form" onSubmit={handleForgotPassword}>
              <label>
                Work Email
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </label>

              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <p className="footer-text">
              Remember your password?{' '}
              <a
                type="button"
                className="login-link"
                onClick={() => setShowForgotPassword(false)}
              >
                Back to Login
              </a>
            </p>
          </section>
        </main>

        <footer className="page-footer">
          <div className="footer-left">
            <span className="brand-footer">HireFlow</span>
            <span>© 2026 HireFlow. All rights reserved.</span>
          </div>
          <div className="footer-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Support</a>
            <a href="#">Status</a>
          </div>
        </footer>
      </div>
    );
  }

  if (user) {
    return (
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
                <h1>{currentPage === 'positions' ? 'Job Positions' : currentPage === 'candidates' ? 'Candidate pipeline' : currentPage === 'workflow' ? 'Workflow overview' : 'Settings'} </h1>
                <p className="dashboard-copy">This workspace page is part of the HireFlow shared layout and will reuse the header and sidebar across every screen.</p>
              </div>
            </div>
          </section>
        )}
      </SharedLayout>
    );
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand">HireFlow</div>
        <div className="top-actions">
          <a type="button" className="login-link" onClick={() => handleModeSwitch('login')}>
            Log In
          </a>
          <button className="top-cta" type="button" onClick={() => handleModeSwitch('signup')}>
            Sign Up
          </button>
        </div>
      </header>

      <main className="content-area">
        <section className="signup-card">
          <div className="card-header">
            <h1>{mode === 'signup' ? 'Create Account' : 'Login'}</h1>
            <p>{mode === 'signup' ? 'Start optimizing your hiring workflow today.' : 'Login with your email and password.'}</p>
          </div>

          {error && <div className="form-alert error">{error}</div>}
          {success && <div className="form-alert success">{success}</div>}

          <form className="signup-form" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <label>
                Full Name
                <input
                  type="text"
                  name="fullName"
                  placeholder="Alex Rivera"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </label>
            )}

            <label>
              Work Email
              <input
                type="email"
                name="email"
                placeholder="name@company.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </label>

            {mode === 'login' && (
              <>
                <div className="login-options">
                  <div className="checkbox-label">
                    <input
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                    />
                    Remember me
                  </div>
                  <button
                    type="button"
                    className="forgot-password-link"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            )}

            {mode === 'signup' && (
              <>
                <label>
                  Confirm Password
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Company Name
                  <input
                    type="text"
                    name="companyName"
                    placeholder="HireFlow Inc."
                    value={formData.companyName}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Job Title
                  <input
                    type="text"
                    name="jobTitle"
                    placeholder="Talent Partner"
                    value={formData.jobTitle}
                    onChange={handleChange}
                  />
                </label>

                <div className="agreement-section">
                  <div className="checkbox-field">
                    <input
                      type="checkbox"
                      name="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="agreement-text">
                    I agree to the&nbsp;<a href="#">Terms of Service</a>&nbsp;and&nbsp;<a href="#">Privacy Policy</a>.
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'signup' ? 'CREATE ACCOUNT' : 'LOG IN'}
            </button>

            <div className="divider">
              <span>OR {mode === 'signup' ? 'JOIN' : 'LOG IN'} WITH</span>
            </div>

            <button type="button" className="secondary-button" onClick={handleGoogleLogin}>
              <span className="google-icon">G</span>
              Google
            </button>
          </form>

          <p className="footer-text">
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <a type="button" className="login-link" onClick={() => handleModeSwitch(mode === 'signup' ? 'login' : 'signup')}>
              {mode === 'signup' ? 'Log In' : 'Sign Up'}
            </a>
          </p>
        </section>
      </main>

      <footer className="page-footer">
        <div className="footer-left">
          <span className="brand-footer">HireFlow</span>
          <span>© 2026 HireFlow. All rights reserved.</span>
        </div>
        <div className="footer-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Support</a>
          <a href="#">Status</a>
        </div>
      </footer>
    </div>
  );
};

export default HRSignUp;
