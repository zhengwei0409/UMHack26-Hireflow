import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

const JobDetail = () => {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [jobRes, candidatesRes] = await Promise.all([
        api.jobs.get(id),
        api.candidates.list({ jobId: id }),
      ]);
      setJob(jobRes.data);
      setCandidates(candidatesRes.data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyPublicUrl = () => {
    const url = `${window.location.origin}/apply/${id}`;
    navigator.clipboard.writeText(url);
    alert('Application URL copied to clipboard!');
  };

  if (loading) return <div className="page-loading">Loading...</div>;
  if (error) return <div className="form-alert error">{error}</div>;
  if (!job) return <div className="form-alert">Job not found</div>;

  return (
    <div className="job-detail-page">
      <div className="page-header">
        <div>
          <Link to="/jobs" className="back-link">← Back to Jobs</Link>
          <h1>{job.title}</h1>
          <p>{job.department} • {job.location}</p>
        </div>
        <button className="secondary-button" onClick={copyPublicUrl}>
          Copy Application Link
        </button>
      </div>

      <div className="job-details-panel">
        <h2>Job Description</h2>
        <p>{job.description}</p>
        {job.requirements?.length > 0 && (
          <>
            <h3>Requirements</h3>
            <ul>
              {job.requirements.map((req, i) => (
                <li key={i}>{req}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      <section className="candidates-section">
        <h2>Applicants ({candidates.length})</h2>
        {candidates.length === 0 ? (
          <div className="empty-state">No applicants yet</div>
        ) : (
          <div className="candidates-table-wrapper">
            <table className="candidates-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
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
                    <td>{c.glmScore !== null ? `${c.glmScore}%` : '-'}</td>
                    <td>
                      <span className={`status-pill status-${c.status.toLowerCase()}`}>
                        {c.status}
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
      </section>
    </div>
  );
};

export default JobDetail;