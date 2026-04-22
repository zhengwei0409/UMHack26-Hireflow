import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const Apply = () => {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [cvFile, setCvFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    try {
      const res = await api.jobs.get(jobId);
      setJob(res.data);
    } catch (err) {
      setError('Job not found');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cvFile) {
      setError('Please upload your CV');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const data = new FormData();
      data.append('jobId', jobId);
      data.append('fullName', formData.fullName);
      data.append('email', formData.email);
      if (formData.phone) data.append('phone', formData.phone);
      data.append('cvFile', cvFile);

      await api.candidates.apply(data);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="apply-page loading">Loading...</div>;
  if (error && !job) return <div className="apply-page error">{error}</div>;

  if (success) {
    return (
      <div className="apply-page">
        <div className="apply-card success-card">
          <div className="success-icon">✓</div>
          <h1>Application Submitted!</h1>
          <p>Thank you for applying for the {job?.title} position.</p>
          <p>We have received your application and will review it shortly.</p>
          <p>If your qualifications match our requirements, we will contact you for the next steps.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="apply-page">
      <div className="apply-card">
        <div className="apply-header">
          <h1>Apply for {job?.title}</h1>
          <p>{job?.department} • {job?.location}</p>
        </div>

        <div className="job-description-preview">
          <h3>Job Description</h3>
          <p>{job?.description}</p>
          {job?.requirements?.length > 0 && (
            <>
              <h4>Requirements</h4>
              <ul>
                {job.requirements.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="apply-form">
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
              placeholder="John Doe"
            />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="john@example.com"
            />
          </div>
          <div className="form-group">
            <label>Phone (optional)</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+60 123 456 789"
            />
          </div>
          <div className="form-group">
            <label>Upload CV * (PDF or DOCX, max 5MB)</label>
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => setCvFile(e.target.files[0])}
              required
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="primary-button full-width" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Apply;