import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const Candidates = () => {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ jobId: '', status: '' });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [filters]);

  const loadData = async () => {
    try {
      const [jobsRes] = await Promise.all([api.jobs.list()]);
      setJobs(jobsRes.data.items || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.jobId) params.jobId = filters.jobId;
      if (filters.status) params.status = filters.status;
      const res = await api.candidates.list(params);
      setCandidates(res.data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusCounts = () => {
    const counts = {};
    candidates.forEach(c => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return counts;
  };

  const counts = getStatusCounts();

  return (
    <div className="candidates-page">
      <div className="page-header">
        <div>
          <h1>Candidates</h1>
          <p>Review and manage all applicants</p>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Job</label>
          <select value={filters.jobId} onChange={(e) => setFilters({ ...filters, jobId: e.target.value })}>
            <option value="">All Jobs</option>
            {jobs.map(job => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Statuses</option>
            <option value="APPLIED">Applied</option>
            <option value="CV_PARSING">CV Parsing</option>
            <option value="CV_UNDER_REVIEW">Under Review</option>
            <option value="CV_REJECTED">Rejected</option>
            <option value="INTERVIEW_PENDING">Interview Pending</option>
            <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
            <option value="INTERVIEW_DONE">Interview Done</option>
            <option value="OFFER_SENT">Offer Sent</option>
            <option value="HIRED">Hired</option>
          </select>
        </div>
      </div>

      {error && <div className="form-alert error">{error}</div>}

      {loading ? (
        <div className="page-loading">Loading...</div>
      ) : (
        <>
          <div className="status-summary">
            {Object.entries(counts).map(([status, count]) => (
              <div key={status} className="status-count">
                <span className="count">{count}</span>
                <span className="label">{status.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>

          {candidates.length === 0 ? (
            <div className="empty-state">No candidates found</div>
          ) : (
            <div className="candidates-table-wrapper">
              <table className="candidates-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Job</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Applied</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id}>
                      <td>{c.fullName}</td>
                      <td>{c.email}</td>
                      <td>{c.jobTitle || '-'}</td>
                      <td>{c.glmScore !== null ? `${c.glmScore}%` : '-'}</td>
                      <td>
                        <span className={`status-pill status-${c.status.toLowerCase()}`}>
                          {c.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '-'}</td>
                      <td>
                        <Link to={`/candidates/${c.id}`} className="secondary-button small">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Candidates;