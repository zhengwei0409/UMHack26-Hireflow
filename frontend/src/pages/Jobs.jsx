import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    description: '',
    requirements: '',
    location: '',
  });

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const res = await api.jobs.list();
      setJobs(res.data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = {
        ...formData,
        requirements: formData.requirements.split('\n').filter(r => r.trim()),
      };
      await api.jobs.create(data);
      setShowForm(false);
      setFormData({ title: '', department: '', description: '', requirements: '', location: '' });
      loadJobs();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to close this job?')) return;
    try {
      await api.jobs.delete(id);
      loadJobs();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="jobs-page">
      <div className="page-header">
        <div>
          <h1>Job Positions</h1>
          <p>Manage your job openings and track applicants</p>
        </div>
        <button className="primary-button" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Create Job'}
        </button>
      </div>

      {showForm && (
        <div className="form-panel">
          <h2>Create New Job</h2>
          <form onSubmit={handleSubmit} className="job-form">
            <div className="form-row">
              <div className="form-group">
                <label>Job Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Software Engineer"
                />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
                  placeholder="Engineering"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                placeholder="Job description..."
                rows={4}
              />
            </div>
            <div className="form-group">
              <label>Requirements (one per line)</label>
              <textarea
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="3+ years experience&#10;React&#10;Node.js"
                rows={4}
              />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                placeholder="Kuala Lumpur"
              />
            </div>
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="primary-button">Create Job</button>
          </form>
        </div>
      )}

      {error && !showForm && <div className="form-alert error">{error}</div>}

      <div className="jobs-list">
        {jobs.length === 0 ? (
          <div className="empty-state">
            <p>No job openings yet. Create your first job!</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="job-card">
              <div className="job-info">
                <h3>{job.title}</h3>
                <p className="job-meta">{job.department} • {job.location}</p>
                <p className="job-desc">{job.description?.substring(0, 150)}...</p>
              </div>
              <div className="job-stats">
                <span className="stat">{job._count?.candidates || 0} applicants</span>
                <span className={`status-pill status-${job.status.toLowerCase()}`}>{job.status}</span>
              </div>
              <div className="job-actions">
                <Link to={`/jobs/${job.id}`} className="secondary-button">View</Link>
                <button className="danger-button" onClick={() => handleDelete(job.id)}>Close</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Jobs;