import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const InterviewResponse = ({ type }) => {
  const { candidateId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    submitResponse();
  }, []);

  const submitResponse = async (rescheduleReason = null) => {
    setLoading(true);
    setError('');
    try {
      const email = searchParams.get('email');
      if (!email) {
        const emailInput = prompt('Please enter your email address to confirm your identity:');
        if (!emailInput) {
          navigate('/');
          return;
        }
        await submitWithEmail(emailInput, rescheduleReason);
      } else {
        await submitWithEmail(email, rescheduleReason);
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const submitWithEmail = async (email, rescheduleReason) => {
    if (type === 'confirm') {
      await api.candidates.confirmInterview(candidateId, email);
    } else {
      await api.candidates.requestReschedule(candidateId, email, rescheduleReason);
    }
  };

  const handleReschedule = (e) => {
    e.preventDefault();
    submitResponse(reason);
  };

  if (loading) {
    return (
      <div className="interview-response-page">
        <div className="response-card">
          <div className="loading-spinner"></div>
          <p>Processing your response...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="interview-response-page">
        <div className="response-card error-card">
          <div className="error-icon">!</div>
          <h1>Unable to Process</h1>
          <p>{error}</p>
          <p className="help-text">Please contact HR directly or try again later.</p>
        </div>
      </div>
    );
  }

  if (success) {
    if (type === 'confirm') {
      return (
        <div className="interview-response-page">
          <div className="response-card success-card">
            <div className="success-icon">✓</div>
            <h1>Interview Confirmed!</h1>
            <p>Thank you for confirming your interview. We look forward to seeing you.</p>
            <p className="help-text">A confirmation email has been sent to your email address.</p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="interview-response-page">
          <div className="response-card">
            <div className="info-icon">!</div>
            <h1>Reschedule Request Submitted</h1>
            <p>Your request to reschedule has been submitted to HR.</p>
            <p className="help-text">HR will review your request and contact you with new interview timing.</p>
          </div>
        </div>
      );
    }
  }

  if (type === 'reschedule' && !showReason) {
    return (
      <div className="interview-response-page">
        <div className="response-card">
          <h1>Request Reschedule</h1>
          <p>Would you like to request a different interview time?</p>
          <button className="primary-button" onClick={() => setShowReason(true)}>
            Yes, I Need to Reschedule
          </button>
          <button className="secondary-button" onClick={() => navigate('/')}>
            No, Continue
          </button>
        </div>
      </div>
    );
  }

  if (type === 'reschedule' && showReason && !success) {
    return (
      <div className="interview-response-page">
        <form className="response-card" onSubmit={handleReschedule}>
          <h1>Request Reschedule</h1>
          <div className="form-group">
            <label>Reason for reschedule (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for the request..."
              rows={4}
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={() => navigate('/')}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={loading}>
              Submit Request
            </button>
          </div>
        </form>
      </div>
    );
  }

  return null;
};

export default InterviewResponse;