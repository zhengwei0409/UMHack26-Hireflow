import React, { useState } from 'react';
import { authAPI } from '../services/api.js';

const Auth = ({ setUser }) => {
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({
    fullName: '', email: '', password: '', confirmPassword: '', companyName: '', agreeToTerms: false, rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) return setError('Email and password required.');

    if (mode === 'signup') {
      if (!formData.fullName) return setError('Full name is required.');
      if (formData.password !== formData.confirmPassword) return setError('Passwords do not match.');
      if (!formData.agreeToTerms) return setError('You must agree to the Terms of Service.');
    }

    setLoading(true);
    try {
      let result;
      if (mode === 'login') {
        result = await authAPI.login(formData.email, formData.password);
      } else {
        result = await authAPI.register(formData.fullName, formData.email, formData.password);
      }

      localStorage.setItem('hireflow_token', result.data.token);
      setUser(result.data.user);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-['Inter',sans-serif] bg-[#f5f5f5]">

      <div className="absolute top-6 left-8">
        <span className="text-xl font-bold tracking-tight text-gray-900">HireFlow</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[440px] bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:p-10 my-8">

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[#202020] tracking-tight">
              {mode === 'login' ? 'Welcome back' : 'Create Account'}
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              {mode === 'login' ? 'Please enter your details to sign in.' : 'Start optimizing your hiring workflow today.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Full Name</label>
                  <input
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#202020] focus:ring-1 focus:ring-[#202020] transition-all duration-300"
                    placeholder="Alex Rivera"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">
                {mode === 'login' ? 'Email Address' : 'Work Email'}
              </label>
              <div className="relative">
                {mode === 'login' && (
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full rounded border border-gray-300 ${mode === 'login' ? 'pl-9' : 'px-3'} py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#202020] focus:ring-1 focus:ring-[#202020] transition-all duration-300`}
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Company Name</label>
                <input
                  name="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#202020] focus:ring-1 focus:ring-[#202020] transition-all duration-300"
                  placeholder="HireFlow Inc."
                />
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest">Password</label>
                {mode === 'login' && (
                  <button type="button" className="text-xs font-bold text-[#1A3077] hover:underline cursor-pointer">Forgot Password</button>
                )}
              </div>
              <div className="relative">
                {mode === 'login' && (
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                )}
                <input
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full rounded border border-gray-300 ${mode === 'login' ? 'pl-9' : 'px-3'} py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#202020] focus:ring-1 focus:ring-[#202020] transition-all duration-300`}
                  placeholder="••••••••"
                />
              </div>
              {mode === 'signup' && (
                <p className="mt-1 text-[10px] text-gray-500">Must be at least 8 characters with one special symbol.</p>
              )}
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full rounded border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#202020] focus:ring-1 focus:ring-[#202020] transition-all duration-300"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="flex items-center mt-4">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-black border-gray-300 rounded focus:ring-black cursor-pointer"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-600 cursor-pointer">
                  Remember Me
                </label>
              </div>
            )}

            {mode === 'signup' && (
              <div className="flex flex-col mt-4">
                <div className="flex items-start mb-4">
                  <div className="flex items-center h-5">
                    <input
                      id="agreeToTerms"
                      name="agreeToTerms"
                      type="checkbox"
                      checked={formData.agreeToTerms}
                      onChange={handleChange}
                      className="h-4 w-4 text-black border-gray-300 rounded focus:ring-black mt-0.5 cursor-pointer"
                    />
                  </div>
                  <div className="ml-2 text-xs text-gray-600">
                    <label htmlFor="agreeToTerms" className="cursor-pointer">
                      I agree to the <a href="#" className="font-bold text-[#1A3077] hover:underline">Terms of Service</a> and <a href="#" className="font-bold text-[#1A3077] hover:underline">Privacy Policy</a>.
                    </label>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'signup' && !formData.agreeToTerms)}
              className="w-full mt-2 flex justify-center items-center py-3 px-4 rounded bg-[#000000] text-sm font-bold text-white hover:bg-[#202020] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {loading ? 'Please wait...' : mode === 'login' ? (
                <>Log In <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></>
              ) : 'CREATE ACCOUNT'}
            </button>

          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                <span className="bg-white px-3 text-gray-400">OR {mode === 'login' ? 'CONTINUE' : 'JOIN'} WITH</span>
              </div>
            </div>

            <div className={`mt-6 grid grid-cols-1`}>
              <button
                type="button"
                onClick={() => window.location.href = authAPI.googleLoginUrl()}
                className="w-full inline-flex justify-center items-center py-2.5 px-4 rounded bg-white border border-gray-300 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="h-4 w-4 mr-2" />
                Google
              </button>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            {mode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
            <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="font-bold text-[#202020] hover:underline cursor-pointer">
              {mode === 'login' ? 'Sign Up' : 'Log In'}
            </button>
          </p>

        </div>
      </div>
    </div>
  );
};

export default Auth;
