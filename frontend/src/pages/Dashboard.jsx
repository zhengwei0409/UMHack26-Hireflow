import React, { useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const Dashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('hireflow_token');
    if (!token) {
      setError('Please log in to view dashboard data.');
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/v1/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error?.message || 'Failed to load dashboard data.');
        }
        return response.json();
      })
      .then((payload) => setDashboard(payload.data))
      .catch((err) => setError(err.message || 'Unable to fetch dashboard metrics.'))
      .finally(() => setLoading(false));
  }, []);

  const metrics = dashboard?.metrics ?? {
    openRoles: 0,
    totalApplicants: 0,
    screenedResumes: 0,
    nextInterviews: 0,
  };
  const positions = dashboard?.positions ?? [];

  return (
    <div className="dashboard-page">
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Job Positions Dashboard</p>
          <h1>AI Resume Screener</h1>
          <p className="dashboard-copy">Track active roles, review applicant progress, and surface top resumes for your hiring workflow.</p>
        </div>
        <button className="primary-button">Create Job</button>
      </section>

      {loading && (
        <section className="positions-panel">
          <p className="form-alert">Loading dashboard data…</p>
        </section>
      )}

      {error && (
        <section className="positions-panel">
          <p className="form-alert error">{error}</p>
        </section>
      )}

      {!loading && !error && (
        <>
          <div className="dashboard-grid">
            <article className="kpi-card">
              <span className="kpi-label">Open roles</span>
              <strong>{metrics.openRoles}</strong>
            </article>
            <article className="kpi-card">
              <span className="kpi-label">Total applicants</span>
              <strong>{metrics.totalApplicants}</strong>
            </article>
            <article className="kpi-card">
              <span className="kpi-label">Screened resumes</span>
              <strong>{metrics.screenedResumes}</strong>
            </article>
            <article className="kpi-card">
              <span className="kpi-label">Next interviews</span>
              <strong>{metrics.nextInterviews}</strong>
            </article>
          </div>

          <section className="positions-panel">
            <div className="panel-header">
              <div>
                <h2>Current job openings</h2>
                <p>Review each role and the current pipeline of applicants.</p>
              </div>
              <div className="panel-actions">
                <button className="secondary-button">Export CSV</button>
                <button className="secondary-button">Filter</button>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="positions-table">
                <thead>
                  <tr>
                    <th>Job title</th>
                    <th>Department</th>
                    <th>Applicants</th>
                    <th>Screened</th>
                    <th>Accepted</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => (
                    <tr key={position.id}>
                      <td>{position.title}</td>
                      <td>{position.department}</td>
                      <td>{position.applicants}</td>
                      <td>{position.screened}</td>
                      <td>{position.accepted}</td>
                      <td>
                        <span className={`status-pill status-${position.status.toLowerCase()}`}>{position.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;
