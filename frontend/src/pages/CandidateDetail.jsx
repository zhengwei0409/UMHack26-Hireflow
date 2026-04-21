import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const STATUS_ACTIONS = {
  CV_UNDER_REVIEW: [
    { key: 'accept-cv', label: 'Accept CV', variant: 'success' },
    { key: 'reject-cv', label: 'Reject CV', variant: 'danger' },
  ],
  INTERVIEW_PENDING: [
    { key: 'schedule-interview', label: 'Schedule Interview', variant: 'primary' },
  ],
  INTERVIEW_SCHEDULED: [
    { key: 'mark-interview-done', label: 'Mark Interview Done', variant: 'primary' },
  ],
  INTERVIEW_CONFIRMED: [
    { key: 'mark-interview-done', label: 'Mark Interview Done', variant: 'primary' },
  ],
  INTERVIEW_RESCHEDULE_REQUESTED: [
    { key: 'schedule-interview', label: 'Reschedule Interview', variant: 'warning' },
  ],
  INTERVIEW_DONE: [
    { key: 'accept-interview', label: 'Accept & Generate Offer', variant: 'success' },
    { key: 'reject-interview', label: 'Reject', variant: 'danger' },
  ],
  CV_PARSE_FAILED: [
    { key: 'retry', label: 'Retry Analysis', variant: 'primary' },
  ],
  INTERVIEW_INVITE_FAILED: [
    { key: 'retry', label: 'Retry Invite', variant: 'primary' },
  ],
  FAILED: [
    { key: 'retry', label: 'Retry', variant: 'primary' },
  ],
};

const CandidateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [note, setNote] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState({ date: '', time: '', location: '', meetingLink: '' });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [candidateRes, historyRes] = await Promise.all([
        api.candidates.get(id),
        api.candidates.history(id),
      ]);
      setCandidate(candidateRes.data);
      setHistory(historyRes.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionKey) => {
    if (actionKey === 'schedule-interview') {
      setShowScheduleModal(true);
      return;
    }

    setActionLoading(actionKey);
    setError('');
    try {
      let action;
      switch (actionKey) {
        case 'accept-cv':
          action = api.candidates.acceptCv(id, note);
          break;
        case 'reject-cv':
          action = api.candidates.rejectCv(id, note);
          break;
        case 'accept-interview':
          action = api.candidates.acceptInterview(id, note);
          break;
        case 'reject-interview':
          action = api.candidates.rejectInterview(id, note);
          break;
        case 'mark-interview-done':
          action = api.candidates.markInterviewDone(id);
          break;
        case 'retry':
          action = api.candidates.retry(id);
          break;
        default:
          return;
      }
      await action;
      await loadData();
      setNote('');
      setShowScheduleModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading('');
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading('schedule');
    try {
      await api.candidates.scheduleInterview(id, scheduleData);
      await loadData();
      setShowScheduleModal(false);
      setScheduleData({ date: '', time: '', location: '', meetingLink: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading('');
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;
  if (error && !candidate) return <div className="form-alert error">{error}</div>;
  if (!candidate) return <div className="form-alert">Candidate not found</div>;

  const actions = STATUS_ACTIONS[candidate.status] || [];
  const glmAnalysis = candidate.glmAnalysis;

  return (
    <div className="candidate-detail-page">
      <div className="page-header">
        <div>
          <Link to="/candidates" className="back-link">← Back to Candidates</Link>
          <h1>{candidate.fullName}</h1>
          <p>{candidate.email} • {candidate.phone || 'No phone'}</p>
        </div>
        <span className={`status-pill status-${candidate.status.toLowerCase()} large`}>
          {candidate.status.replace(/_/g, ' ')}
        </span>
      </div>

      {error && <div className="form-alert error">{error}</div>}

      <div className="detail-grid">
        <div className="detail-main">
          <section className="detail-section">
            <h2>Application Details</h2>
            <div className="detail-row">
              <span className="label">Job:</span>
              <span>{candidate.job?.title || '-'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Department:</span>
              <span>{candidate.job?.department || '-'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Applied:</span>
              <span>{new Date(candidate.createdAt).toLocaleString()}</span>
            </div>
            {candidate.glmScore !== null && (
              <div className="detail-row">
                <span className="label">AI Score:</span>
                <span className="score">{candidate.glmScore}/100</span>
              </div>
            )}
          </section>

          {glmAnalysis && (
            <section className="detail-section">
              <h2>AI Analysis</h2>
              <p className="glm-summary">{glmAnalysis.summary}</p>
              <div className="glm-details">
                <div className="glm-strengths">
                  <h4>Strengths</h4>
                  <ul>
                    {glmAnalysis.strengths?.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="glm-weaknesses">
                  <h4>Weaknesses</h4>
                  <ul>
                    {glmAnalysis.weaknesses?.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="glm-recommendation">
                <span className="label">Recommendation:</span>
                <span className={`recommendation ${glmAnalysis.recommendation.toLowerCase()}`}>
                  {glmAnalysis.recommendation}
                </span>
              </div>
            </section>
          )}

          <section className="detail-section">
            <h2>Status History</h2>
            <div className="history-timeline">
              {history.length === 0 ? (
                <p>No history yet</p>
              ) : (
                history.map((h, i) => (
                  <div key={i} className="history-item">
                    <div className="history-dot" />
                    <div className="history-content">
                      <span className="history-event">{h.event}</span>
                      <span className="history-status">{h.from || 'START'} → {h.to}</span>
                      <span className="history-meta">
                        by {h.triggeredBy} • {new Date(h.at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="detail-sidebar">
          <section className="action-panel">
            <h3>Actions</h3>
            {actions.length > 0 ? (
              <>
                <div className="form-group">
                  <label>Note (optional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note..."
                    rows={3}
                  />
                </div>
                {actions.map((action) => (
                  <button
                    key={action.key}
                    className={`${action.variant === 'success' ? 'primary-button' : action.variant === 'danger' ? 'danger-button' : 'secondary-button'} full-width`}
                    onClick={() => handleAction(action.key)}
                    disabled={actionLoading === action.key}
                  >
                    {actionLoading === action.key ? 'Processing...' : action.label}
                  </button>
                ))}
              </>
            ) : (
              <p className="no-actions">No actions available for this status</p>
            )}
          </section>

          <section className="cv-panel">
            <h3>CV Document</h3>
            <a
              href={`${import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/v1'}/candidates/${id}/cv`}
              target="_blank"
              rel="noopener noreferrer"
              className="secondary-button full-width"
            >
              Download CV
            </a>
          </section>

          <section className="action-panel danger-zone">
            <h3>Danger Zone</h3>
            <p>Delete this candidate and all associated data.</p>
            <button
              className="danger-button full-width"
              onClick={async () => {
                if (window.confirm(`Are you sure you want to delete ${candidate.fullName}? This action cannot be undone.`)) {
                  try {
                    await api.candidates.delete(id);
                    navigate('/candidates');
                  } catch (err) {
                    setError(err.message);
                  }
                }
              }}
            >
              Delete Candidate
            </button>
          </section>
        </div>
      </div>

      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Schedule Interview</h2>
            <form onSubmit={handleScheduleSubmit}>
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={scheduleData.date}
                  onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Time *</label>
                <input
                  type="time"
                  value={scheduleData.time}
                  onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Location *</label>
                <input
                  type="text"
                  value={scheduleData.location}
                  onChange={(e) => setScheduleData({ ...scheduleData, location: e.target.value })}
                  placeholder="e.g., Conference Room A or Online"
                  required
                />
              </div>
              <div className="form-group">
                <label>Meeting Link (optional)</label>
                <input
                  type="url"
                  value={scheduleData.meetingLink}
                  onChange={(e) => setScheduleData({ ...scheduleData, meetingLink: e.target.value })}
                  placeholder="https://zoom.us/..."
                />
              </div>
              {error && <div className="form-error">{error}</div>}
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowScheduleModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={actionLoading === 'schedule'}>
                  {actionLoading === 'schedule' ? 'Sending...' : 'Schedule & Send Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateDetail;