import React, { useEffect, useState } from 'react';
import '../styles/createjob.css';

const DEPARTMENTS = ['Engineering', 'Product', 'Design', 'Sales', 'Marketing', 'Operations'];
const EXPERIENCES = ['Entry (0-2 years)', 'Mid (2-5 years)', 'Senior (5+ years)', 'Lead (8+ years)'];
const DURATIONS = ['4 weeks', '8 weeks', '12 weeks', '3 months', '6 months'];

const CreateJob = () => {
  const [jobData, setJobData] = useState({
    title: '',
    department: 'Engineering',
    experience: 'Senior (5+ years)',
    duration: '3 months',
    location: 'Remote',
    jobSummary: '',
    screeningInstructions: '',
    keySkills: []
  });
  const [keySkillInput, setKeySkillInput] = useState('');
  const [status, setStatus] = useState({ error: '', success: '', loading: false });

  useEffect(() => {
    const draft = localStorage.getItem('hireflow_job_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setJobData((prev) => ({ ...prev, ...parsed }));
      } catch {
        // ignore invalid draft data
      }
    }
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setJobData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSkill = (event) => {
    if (event) {
      event.preventDefault();
    }

    const skill = keySkillInput.trim();
    if (!skill) {
      return;
    }

    setJobData((prev) => {
      if (prev.keySkills.includes(skill)) {
        return prev;
      }
      return { ...prev, keySkills: [...prev.keySkills, skill] };
    });
    setKeySkillInput('');
  };

  const handleSkillKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddSkill(event);
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setJobData((prev) => ({
      ...prev,
      keySkills: prev.keySkills.filter((skill) => skill !== skillToRemove)
    }));
  };

  const handleSaveDraft = () => {
    localStorage.setItem('hireflow_job_draft', JSON.stringify(jobData));
    setStatus({ error: '', success: 'Draft saved in your browser.', loading: false });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus({ error: '', success: '', loading: true });

    const token = localStorage.getItem('hireflow_token');
    if (!token) {
      setStatus({ error: 'You must be logged in to save this job.', success: '', loading: false });
      return;
    }

    const { title, department, location, experience, duration, jobSummary, screeningInstructions, keySkills } = jobData;
    const contentParts = [];

    if (jobSummary.trim()) {
      contentParts.push(jobSummary.trim());
    }

    contentParts.push(`Required experience: ${experience}.`);
    contentParts.push(`Hiring duration: ${duration}.`);
    contentParts.push(`Location: ${location}.`);

    if (screeningInstructions.trim()) {
      contentParts.push(`AI screening instructions: ${screeningInstructions.trim()}`);
    }

    const description = contentParts.join('\n\n');

    if (!title.trim() || !department.trim() || !location.trim() || !description.trim()) {
      setStatus({ error: 'Please complete the job title, department, location, and summary fields.', success: '', loading: false });
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:3000'}/api/v1/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          department,
          location: location.trim(),
          description,
          requirements: keySkills
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error?.message || 'Unable to create job.');
      }

      localStorage.removeItem('hireflow_job_draft');
      setStatus({ error: '', success: 'Job created successfully. AI analysis can begin now.', loading: false });
      setJobData({
        title: '',
        department: 'Engineering',
        experience: 'Senior (5+ years)',
        duration: '3 months',
        location: 'Remote',
        jobSummary: '',
        screeningInstructions: '',
        keySkills: []
      });
    } catch (err) {
      setStatus({ error: err.message || 'Something went wrong while creating the job.', success: '', loading: false });
    }
  };

  return (
    <div className="create-job-page">
      <section className="create-job-header">
        <div>
          <p className="eyebrow">Job Requirements Setup</p>
          <h1>Define the role and screening instructions</h1>
          <p>Enter the open position parameters and expected recruitment duration to calibrate the AI screening engine.</p>
        </div>
      </section>

      <form className="create-job-grid" onSubmit={handleSubmit}>
        {status.error && <div className="form-alert error">{status.error}</div>}
        {status.success && <div className="form-alert success">{status.success}</div>}

        <section className="form-card">
          <div>
            <h2>Core Details</h2>
            <p>Define the role, department, location, and hiring timeframe.</p>
          </div>

          <div className="field-grid">
            <div className="form-field">
              <label htmlFor="title">Job Title</label>
              <input
                id="title"
                name="title"
                type="text"
                placeholder="e.g., Senior Full Stack Engineer"
                value={jobData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="department">Department</label>
              <select id="department" name="department" value={jobData.department} onChange={handleChange}>
                {DEPARTMENTS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="experience">Required Experience</label>
              <select id="experience" name="experience" value={jobData.experience} onChange={handleChange}>
                {EXPERIENCES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="duration">Recruitment Duration</label>
              <select id="duration" name="duration" value={jobData.duration} onChange={handleChange}>
                {DURATIONS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                name="location"
                type="text"
                placeholder="e.g., Remote, New York, Hybrid"
                value={jobData.location}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="jobSummary">Job Summary</label>
              <textarea
                id="jobSummary"
                name="jobSummary"
                placeholder="Describe the role and the most important responsibilities."
                value={jobData.jobSummary}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        <section className="form-card">
          <div>
            <h2>Key Skills</h2>
            <p>Add the most critical skills for candidate matching.</p>
          </div>

          <div className="tags-row">
            <label htmlFor="keySkill">Type a skill</label>
            <div className="tags-input">
              <input
                id="keySkill"
                type="text"
                className="tag-input-field"
                value={keySkillInput}
                onChange={(event) => setKeySkillInput(event.target.value)}
                onKeyDown={handleSkillKeyDown}
                placeholder="e.g., GraphQL, React, People management"
              />
              <button type="button" className="add-button" onClick={handleAddSkill}>
                Add
              </button>
            </div>

            <ul className="tags-list">
              {jobData.keySkills.length === 0 && <li className="subtle-note">No skills added yet.</li>}
              {jobData.keySkills.map((skill) => (
                <li key={skill} className="tag-pill">
                  {skill}
                  <button type="button" onClick={() => handleRemoveSkill(skill)} aria-label={`Remove ${skill}`}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="form-card">
          <div className="premium-note">
            <span>⭐</span>
            <span>AI Screening Instructions</span>
          </div>
          <div className="form-field">
            <label htmlFor="screeningInstructions">Provide specific context to guide the AI’s analysis of applicant resumes.</label>
            <textarea
              id="screeningInstructions"
              name="screeningInstructions"
              placeholder="Focus on leadership experience and mentoring junior developers. Ignore short gaps in employment. Prioritize candidates with experience scaling high-traffic applications."
              value={jobData.screeningInstructions}
              onChange={handleChange}
            />
            <span className="subtle-note">This instruction helps the AI prioritize candidates who meet your business goals.</span>
          </div>
        </section>

        <section className="form-card">
          <div className="form-actions">
            <button type="button" className="secondary-button compact" onClick={handleSaveDraft}>
              Save Draft
            </button>
            <button type="submit" className="primarycreate-button compact" disabled={status.loading}>
              {status.loading ? 'Saving...' : 'Save & Start AI Analysis'}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
};

export default CreateJob;
