const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const getAuthHeaders = () => {
  const token = localStorage.getItem('hireflow_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const authAPI = {
  me: async () => {
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Not authenticated');
    return res.json();
  },
  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result?.error?.message || 'Authentication failed.');
    return result;
  },
  register: async (name, email, password) => {
    const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result?.error?.message || 'Registration failed.');
    return result;
  },
  forgotPassword: async (email) => {
    const res = await fetch(`${API_BASE}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok && res.status !== 404) throw new Error('Failed to send reset email.');
    return res.json();
  },
  googleLoginUrl: () => `${API_BASE}/api/v1/auth/google`,
};

export const dashboardAPI = {
  getDashboardData: async () => {
    const res = await fetch(`${API_BASE}/api/v1/dashboard`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch dashboard data');
    return res.json();
  }
};

export const jobsAPI = {
  getJob: async (id) => {
    const res = await fetch(`${API_BASE}/api/v1/jobs/${id}`, { headers: getAuthHeaders() });
    const result = await res.json();
    if (!res.ok) throw new Error(result?.error?.message || 'Failed to fetch job');
    return result;
  },
  createJob: async (jobData) => {
    const res = await fetch(`${API_BASE}/api/v1/jobs`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(jobData)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result?.error?.message || 'Failed to create job');
    return result;
  },
  updateJob: async (id, jobData) => {
    const res = await fetch(`${API_BASE}/api/v1/jobs/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(jobData)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result?.error?.message || 'Failed to update job');
    return result;
  },
  deleteJob: async (id) => {
    const res = await fetch(`${API_BASE}/api/v1/jobs/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result?.error?.message || 'Failed to delete job');
    return result;
  }
};
