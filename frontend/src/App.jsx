import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth.jsx';
import AuthCallback from './pages/AuthCallback.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CreateJob from './pages/CreateJob.jsx';
import SharedLayout from './components/SharedLayout.jsx';
import { authAPI } from './services/api.js';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('hireflow_token');
      if (token) {
        try {
          const res = await authAPI.me();
          if (res.success) {
            setUser(res.data);
          } else {
            localStorage.removeItem('hireflow_token');
          }
        } catch (err) {
          localStorage.removeItem('hireflow_token');
        }
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Auth setUser={setUser} />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        {/* Protected Routes */}
        <Route element={user ? <SharedLayout user={user} setUser={setUser} /> : <Navigate to="/" replace />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/jobs/new" element={<CreateJob />} />
          <Route path="/candidates" element={
            <div className="p-8">
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Candidates</h1>
              <p className="text-slate-500 mt-2">Candidate pipeline management coming soon.</p>
            </div>
          } />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
