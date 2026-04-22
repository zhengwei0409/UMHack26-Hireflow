import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const formatStatus = (status = '') =>
  status
    .toString()
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const StatIcon = ({ type }) => {
  const paths = {
    roles: (
      <>
        <path d="M7 7.75V6.5A2.5 2.5 0 0 1 9.5 4h1A2.5 2.5 0 0 1 13 6.5v1.25" />
        <path d="M4.75 7.75h10.5v7.5H4.75z" />
      </>
    ),
    applicants: (
      <>
        <path d="M7.25 15.25v-1a2.75 2.75 0 0 1 5.5 0v1" />
        <path d="M10 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        <path d="M14 9.25a1.75 1.75 0 0 1 1.5 2.65" />
      </>
    ),
    location: (
      <>
        <path d="M10 10.25a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        <path d="M14.75 8.25c0 3.6-4.75 7-4.75 7s-4.75-3.4-4.75-7a4.75 4.75 0 1 1 9.5 0Z" />
      </>
    ),
  };

  return (
    <svg className="h-4 w-4 text-[#202020]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[type]}
    </svg>
  );
};

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    requiredExperience: 'Senior (5+ years)',
    keySkills: [],
    aiInstructions: '',
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
        title: formData.title,
        department: formData.department,
        description: formData.aiInstructions || 'Use the listed role details and key skills to evaluate applicant resumes.',
        requirements: [formData.requiredExperience, ...formData.keySkills].filter((r) => r.trim()),
        location: 'Remote',
      };
      await api.jobs.create(data);
      setShowForm(false);
      setSkillInput('');
      setFormData({
        title: '',
        department: '',
        requiredExperience: 'Senior (5+ years)',
        keySkills: [],
        aiInstructions: '',
      });
      loadJobs();
    } catch (err) {
      setError(err.message);
    }
  };

  const addSkill = () => {
    const nextSkill = skillInput.trim();
    if (!nextSkill || formData.keySkills.some((skill) => skill.toLowerCase() === nextSkill.toLowerCase())) return;
    setFormData({ ...formData, keySkills: [...formData.keySkills, nextSkill] });
    setSkillInput('');
  };

  const removeSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      keySkills: formData.keySkills.filter((skill) => skill !== skillToRemove),
    });
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

  const activeJobs = jobs.filter((job) => job.status !== 'CLOSED').length;
  const applicantCount = jobs.reduce((sum, job) => sum + (job._count?.candidates || 0), 0);
  const departments = new Set(jobs.map((job) => job.department).filter(Boolean)).size;

  const inputClass = 'mt-2 h-9 w-full rounded-md border border-[#d5d5d5] bg-[#fbfbfb] px-3 text-sm font-semibold text-[#202020] outline-none transition placeholder:text-[#b7b7b7] focus:border-[#202020] focus:bg-white focus:ring-2 focus:ring-[#202020]/10';
  const labelClass = 'text-xs font-extrabold text-[#444444]';
  const sectionClass = 'rounded-lg border border-[#d9d9d9] bg-white p-5 shadow-sm';
  const sectionTitleClass = 'flex items-center gap-2 text-base font-extrabold tracking-normal text-[#303030]';

  if (loading) {
    return (
      <div className="min-h-full bg-[#f2f3f5] px-4 py-4 text-[#202020] sm:px-6 lg:px-7">
        <section className="rounded-md border border-[#d9d9d9] bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-[#555555]">Loading job positions...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f2f3f5] px-4 py-4 text-[#202020] sm:px-6 lg:px-7">
      <header className="mb-6 flex flex-col gap-4 border-b border-[#d9d9d9] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1a3077]">Recruitment</p>
          <h1 className="mt-1 text-xl font-bold tracking-normal text-[#202020]">Job Positions</h1>
          <p className="mt-1 text-sm font-semibold text-[#666666]">Manage openings, applicants, and role visibility.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-[#050505] px-4 text-xs font-bold text-white shadow-sm transition hover:bg-[#202020] focus:outline-none focus:ring-2 focus:ring-[#202020]/20"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {showForm ? <path d="M4 8h8" /> : <path d="M8 3.5v9M3.5 8h9" />}
          </svg>
          {showForm ? 'Cancel' : 'Create Job'}
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Active Roles', value: activeJobs, icon: 'roles' },
          { label: 'Applicants', value: applicantCount, icon: 'applicants' },
          { label: 'Departments', value: departments, icon: 'location' },
        ].map((stat) => (
          <article key={stat.label} className="flex min-h-24 items-center gap-5 rounded-md border border-[#d9d9d9] bg-white px-6 py-5 shadow-sm">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[#eeeeee] bg-[#f7f7f7]">
              <StatIcon type={stat.icon} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#525252]">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold leading-none text-[#202020]">{stat.value}</p>
            </div>
          </article>
        ))}
      </section>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>
              <svg className="h-4 w-4 text-[#050505]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M7.25 4.5A2.25 2.25 0 0 1 9.5 2.25h1A2.25 2.25 0 0 1 12.75 4.5v.75h2.5A1.75 1.75 0 0 1 17 7v8.25A1.75 1.75 0 0 1 15.25 17H4.75A1.75 1.75 0 0 1 3 15.25V7a1.75 1.75 0 0 1 1.75-1.75h2.5V4.5Zm1.5.75h2.5V4.5a.75.75 0 0 0-.75-.75h-1a.75.75 0 0 0-.75.75v.75Z" />
              </svg>
              Core Details
            </h2>

            <div className="mt-5">
              <label className={labelClass}>Job Title</label>
              <input
                className={inputClass}
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="e.g., Senior Full Stack Engineer"
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Department</label>
                <select
                  className={inputClass}
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
                >
                  <option value="" disabled>
                    Select department
                  </option>
                  <option value="Engineering">Engineering</option>
                  <option value="Product">Product</option>
                  <option value="Design">Design</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Operations">Operations</option>
                  <option value="People">People</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Required Experience</label>
                <select
                  className={inputClass}
                  value={formData.requiredExperience}
                  onChange={(e) => setFormData({ ...formData, requiredExperience: e.target.value })}
                  required
                >
                  <option>Entry (0-2 years)</option>
                  <option>Mid-Level (3-4 years)</option>
                  <option>Senior (5+ years)</option>
                  <option>Lead (8+ years)</option>
                </select>
              </div>
            </div>
          </section>

          <section className={sectionClass}>
            <h2 className={sectionTitleClass}>
              <svg className="h-4 w-4 text-[#050505]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m7.25 6-3.5 4 3.5 4M12.75 6l3.5 4-3.5 4" />
              </svg>
              Key Skills
            </h2>
            <p className="mt-3 text-xs font-bold text-[#777777]">Add the most critical skills for candidate matching.</p>

            <div className="mt-3 flex gap-2">
              <input
                className="h-9 min-w-0 flex-1 rounded-md border border-[#d5d5d5] bg-[#fbfbfb] px-3 text-sm font-semibold text-[#202020] outline-none transition placeholder:text-[#b7b7b7] focus:border-[#202020] focus:bg-white focus:ring-2 focus:ring-[#202020]/10"
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Type a skill..."
              />
              <button
                type="button"
                onClick={addSkill}
                className="grid h-9 w-10 shrink-0 place-items-center rounded-md border border-[#d0d0d0] bg-[#eeeeee] text-[#202020] transition hover:border-[#202020] hover:bg-white"
                aria-label="Add skill"
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M8 3.5v9M3.5 8h9" />
                </svg>
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {formData.keySkills.length === 0 ? (
                <span className="rounded-full border border-dashed border-[#cfcfcf] px-3 py-1 text-xs font-bold text-[#777777]">No skills added</span>
              ) : (
                formData.keySkills.map((skill, index) => {
                  const isPrimary = index < 3;
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className={`inline-flex h-6 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition ${
                        isPrimary ? 'bg-[#050505] text-white hover:bg-[#202020]' : 'bg-[#e9e9e9] text-[#444444] hover:bg-[#dddddd]'
                      }`}
                      aria-label={`Remove ${skill}`}
                    >
                      {skill}
                      <span aria-hidden="true">x</span>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className={sectionClass}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className={sectionTitleClass}>
                  <svg className="h-4 w-4 text-[#1a3077]" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path d="M10 2.5a1 1 0 0 1 .87.5l.75 1.32 1.5-.4a1 1 0 0 1 1.2.7l.42 1.5 1.5.42a1 1 0 0 1 .7 1.2l-.4 1.5 1.32.75a1 1 0 0 1 0 1.74l-1.32.75.4 1.5a1 1 0 0 1-.7 1.2l-1.5.42-.42 1.5a1 1 0 0 1-1.2.7l-1.5-.4-.75 1.32a1 1 0 0 1-1.74 0l-.75-1.32-1.5.4a1 1 0 0 1-1.2-.7l-.42-1.5-1.5-.42a1 1 0 0 1-.7-1.2l.4-1.5-1.32-.75a1 1 0 0 1 0-1.74l1.32-.75-.4-1.5a1 1 0 0 1 .7-1.2l1.5-.42.42-1.5a1 1 0 0 1 1.2-.7l1.5.4L9.13 3A1 1 0 0 1 10 2.5Zm-3 7.75 1.6 1.6L13 7.45 14.05 8.5 8.6 13.95 5.95 11.3 7 10.25Z" />
                  </svg>
                  AI Screening Instructions
                </h2>
                <p className="mt-1 text-xs font-bold text-[#777777]">Provide specific context to guide the AI's analysis of applicant resumes.</p>
              </div>
              <span className="w-fit rounded-sm bg-[#eef1f7] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#1a3077]">
                Premium Feature
              </span>
            </div>
            <textarea
              className="mt-4 min-h-28 w-full resize-y rounded-md border border-[#d5d5d5] bg-[#fbfbfb] px-3 py-3 text-sm font-semibold leading-6 text-[#202020] outline-none transition placeholder:text-[#8a8a8a] focus:border-[#202020] focus:bg-white focus:ring-2 focus:ring-[#202020]/10"
              value={formData.aiInstructions}
              onChange={(e) => setFormData({ ...formData, aiInstructions: e.target.value })}
              placeholder="Focus heavily on leadership experience and mentoring junior developers. Ignore gaps in employment less than 6 months. Prioritize candidates with experience scaling high-traffic applications."
              rows={4}
            />

            {error && (
              <div className="mt-4 rounded-md border border-[#f0b8b8] bg-[#fff7f7] px-4 py-3 text-sm font-semibold text-[#991b1b]">
                {error}
              </div>
            )}
          </section>

          <div className="flex justify-end">
            <button type="submit" className="inline-flex h-10 items-center justify-center rounded-sm bg-[#050505] px-5 text-xs font-bold text-white shadow-sm transition hover:bg-[#202020] focus:outline-none focus:ring-2 focus:ring-[#202020]/20">
              Create Job
            </button>
          </div>
        </form>
      )}

      {error && !showForm && (
        <div className="mt-6 rounded-md border border-[#f0b8b8] bg-white px-4 py-3 text-sm font-semibold text-[#991b1b] shadow-sm">
          {error}
        </div>
      )}

      <section className="mt-6 overflow-hidden rounded-md border border-[#d9d9d9] bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-[#e3e3e3] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold tracking-normal text-[#202020]">Open Positions</h2>
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#666666]">{jobs.length} total</span>
        </div>

        {jobs.length === 0 ? (
          <div className="bg-[#f5f5f5] p-5">
            <div className="rounded-md border border-[#d9d9d9] bg-white px-5 py-10 text-center shadow-sm">
              <p className="text-sm font-bold text-[#202020]">No job openings yet.</p>
              <p className="mt-1 text-sm font-semibold text-[#666666]">Create your first job to begin collecting applicants.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#e3e3e3]">
            {jobs.map((job) => {
              const applicantTotal = job._count?.candidates || 0;
              const description = job.description?.length > 150 ? `${job.description.substring(0, 150)}...` : job.description;

              return (
                <article key={job.id} className="grid gap-4 px-5 py-5 transition hover:bg-[#fafafa] lg:grid-cols-[minmax(0,1fr)_180px_160px] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-sm bg-[#eeeeee] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#555555]">
                        {job.department || 'General'}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#555555]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#1a3077]" />
                        {formatStatus(job.status)}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-extrabold leading-tight tracking-normal text-[#202020]">{job.title}</h3>
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#555555]">
                      <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                        <path d="M8 1.75a4.75 4.75 0 0 0-4.75 4.75c0 3.25 4.75 7.75 4.75 7.75s4.75-4.5 4.75-7.75A4.75 4.75 0 0 0 8 1.75Zm0 6.5a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Z" />
                      </svg>
                      {job.location}
                    </p>
                    {description && <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-[#666666]">{description}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:max-w-xs lg:grid-cols-1">
                    <div className="rounded-md border border-[#eeeeee] bg-[#f7f7f7] px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#666666]">Applicants</p>
                      <p className="mt-1 text-xl font-extrabold leading-none text-[#202020]">{applicantTotal}</p>
                    </div>
                    <div className="rounded-md border border-[#eeeeee] bg-white px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#666666]">Status</p>
                      <p className="mt-1 text-sm font-extrabold text-[#202020]">{formatStatus(job.status)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-[#cfcfcf] bg-white px-4 text-xs font-bold text-[#202020] transition hover:border-[#202020]"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(job.id)}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-[#d8b4b4] bg-white px-4 text-xs font-bold text-[#991b1b] transition hover:border-[#991b1b] hover:bg-[#fff7f7]"
                    >
                      Close
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default Jobs;
