import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import api from './services/api';
import SharedLayout from './components/SharedLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Candidates from './pages/Candidates';
import CandidateDetail from './pages/CandidateDetail';
import Apply from './pages/Apply';
import AuthCallback from './pages/AuthCallback';
import InterviewResponse from './pages/InterviewResponse';
import HRSignUp from './HR_SignUp';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hireflow_token');
    if (token) {
      api.auth.me()
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('hireflow_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.auth.login(email, password);
    localStorage.setItem('hireflow_token', res.data.token);
    setUser(res.data.user);
    return res;
  };

  const register = async (email, password, name) => {
    const res = await api.auth.register(email, password, name);
    localStorage.setItem('hireflow_token', res.data.token);
    setUser(res.data.user);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('hireflow_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/" state={{ from: location }} replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/interview/confirm/:candidateId" element={<InterviewResponse type="confirm" />} />
          <Route path="/interview/reschedule/:candidateId" element={<InterviewResponse type="reschedule" />} />
          <Route path="/apply/:jobId" element={<Apply />} />
          <Route path="/" element={<HRSignUp />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route element={<PrivateRoute><SharedLayout /></PrivateRoute>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="jobs/:id" element={<JobDetail />} />
            <Route path="candidates" element={<Candidates />} />
            <Route path="candidates/:id" element={<CandidateDetail />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
