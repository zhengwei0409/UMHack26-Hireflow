const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/v1';

const getToken = () => localStorage.getItem('hireflow_token');

const headers = () => {
  const token = getToken();
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
};

async function handleResponse(response) {
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error?.message || 'Request failed');
  }
  return response.json();
}

export const auth = {
  login: (email, password) =>
    fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(handleResponse),

  register: (email, password, name) =>
    fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    }).then(handleResponse),

  me: () =>
    fetch(`${API_BASE}/auth/me`, { headers: headers() }).then(handleResponse),

  google: () => {
    window.location.href = `${API_BASE}/auth/google`;
  },
};

export const jobs = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/jobs${query ? `?${query}` : ''}`, {
      headers: headers(),
    }).then(handleResponse);
  },

  get: (id) =>
    fetch(`${API_BASE}/jobs/${id}`, { headers: headers() }).then(handleResponse),

  create: (data) =>
    fetch(`${API_BASE}/jobs`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  update: (id, data) =>
    fetch(`${API_BASE}/jobs/${id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  updatePrescreenConfig: (id, data) =>
    fetch(`${API_BASE}/jobs/${id}/prescreen-config`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  shortlist: (id, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/jobs/${id}/shortlist${query ? `?${query}` : ''}`, {
      headers: headers(),
    }).then(handleResponse);
  },

  delete: (id) =>
    fetch(`${API_BASE}/jobs/${id}`, {
      method: 'DELETE',
      headers: headers(),
    }).then(handleResponse),
};

export const candidates = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/candidates${query ? `?${query}` : ''}`, {
      headers: headers(),
    }).then(handleResponse);
  },

  get: (id) =>
    fetch(`${API_BASE}/candidates/${id}`, { headers: headers() }).then(handleResponse),

  apply: async (formData) => {
    const response = await fetch(`${API_BASE}/candidates/apply`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(response);
  },

  history: (id) =>
    fetch(`${API_BASE}/candidates/${id}/history`, { headers: headers() }).then(handleResponse),

  getAiReport: (id) =>
    fetch(`${API_BASE}/candidates/${id}/ai-report`, { headers: headers() }).then(handleResponse),

  acceptCv: (id, note) =>
    fetch(`${API_BASE}/candidates/${id}/actions/accept-cv`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ note }),
    }).then(handleResponse),

  rejectCv: (id, note) =>
    fetch(`${API_BASE}/candidates/${id}/actions/reject-cv`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ note }),
    }).then(handleResponse),

  acceptInterview: (id, note) =>
    fetch(`${API_BASE}/candidates/${id}/actions/accept-interview`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ note }),
    }).then(handleResponse),

  rejectInterview: (id, note) =>
    fetch(`${API_BASE}/candidates/${id}/actions/reject-interview`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ note }),
    }).then(handleResponse),

  advanceToHumanInterview: (id, note) =>
    fetch(`${API_BASE}/candidates/${id}/actions/advance-to-human-interview`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ note }),
    }).then(handleResponse),

  rejectAfterAi: (id, note) =>
    fetch(`${API_BASE}/candidates/${id}/actions/reject-after-ai`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ note }),
    }).then(handleResponse),

  markInterviewDone: (id) =>
    fetch(`${API_BASE}/candidates/${id}/actions/mark-interview-done`, {
      method: 'POST',
      headers: headers(),
    }).then(handleResponse),

  retry: (id) =>
    fetch(`${API_BASE}/candidates/${id}/actions/retry`, {
      method: 'POST',
      headers: headers(),
    }).then(handleResponse),

  scheduleInterview: (id, data) =>
    fetch(`${API_BASE}/candidates/${id}/actions/schedule-interview`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  confirmInterview: (id, email) =>
    fetch(`${API_BASE}/candidates/respond/${id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then(handleResponse),

  requestReschedule: (id, email, reason) =>
    fetch(`${API_BASE}/candidates/respond/${id}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, reason }),
    }).then(handleResponse),

  delete: (id) =>
    fetch(`${API_BASE}/candidates/${id}`, {
      method: 'DELETE',
      headers: headers(),
    }).then(handleResponse),
};

export const dashboard = {
  get: () =>
    fetch(`${API_BASE}/dashboard`, { headers: headers() }).then(handleResponse),
};

export const interviews = {
  get: (token) =>
    fetch(`${API_BASE}/interviews/session/${token}`).then(handleResponse),

  start: (token) =>
    fetch(`${API_BASE}/interviews/session/${token}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).then(handleResponse),

  saveAnswer: (token, data) =>
    fetch(`${API_BASE}/interviews/session/${token}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  runCode: (token, data) =>
    fetch(`${API_BASE}/interviews/session/${token}/code-exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),

  logProctorEvents: (token, events) =>
    fetch(`${API_BASE}/interviews/session/${token}/proctor-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    }).then(handleResponse),

  submit: (token) =>
    fetch(`${API_BASE}/interviews/session/${token}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).then(handleResponse),

  shortlist: (jobId) => {
    const query = jobId ? `?${new URLSearchParams({ jobId }).toString()}` : '';
    return fetch(`${API_BASE}/interviews/ranked-shortlist${query}`, {
      headers: headers(),
    }).then(handleResponse);
  },

  updateShortlist: (sessionId, shortlisted) =>
    fetch(`${API_BASE}/interviews/ranked-shortlist/${sessionId}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ shortlisted }),
    }).then(handleResponse),
};

export default { auth, jobs, candidates, dashboard, interviews };
