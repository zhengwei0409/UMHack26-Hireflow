import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>HireFlow</h1>
        <p className="auth-subtitle">AI-Powered HR Hiring Pipeline</p>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name"
              />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="hr@company.com"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          
          {error && <div className="form-error">{error}</div>}
          
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        
        <div className="auth-switch">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Sign In' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;