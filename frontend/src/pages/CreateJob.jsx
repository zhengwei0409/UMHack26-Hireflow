import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { jobsAPI } from '../services/api.js';

const DEPARTMENTS = ['Engineering', 'Product', 'Design', 'Sales', 'Marketing', 'Operations'];
const EXPERIENCES = ['Entry (0-2 years)', 'Mid (2-5 years)', 'Senior (5+ years)', 'Lead (8+ years)'];

const CreateJob = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const editingJob = state?.job;

  const [jobData, setJobData] = useState({
    title: editingJob?.title || '',
    department: editingJob?.department || '',
    experience: '',
    location: editingJob?.location || 'Remote',
    duration: '3 months',
    screeningInstructions: '',
    keySkills: []
  });
  const [keySkillInput, setKeySkillInput] = useState('');
  const [status, setStatus] = useState({ error: '', success: '', loading: false });

  useEffect(() => {
    if (editingJob) {
      const fetchFullJob = async () => {
        try {
          const result = await jobsAPI.getJob(editingJob.id);
          const fullJob = result.data;

          let exp = 'Senior (5+ years)';
          let descText = fullJob.description || '';

          const expMatch = descText.match(/Required experience: (.*?)\./);
          if (expMatch) exp = expMatch[1];

          setJobData({
            title: fullJob.title || '',
            department: fullJob.department || 'Engineering',
            experience: exp,
            location: fullJob.location || 'Remote',
            duration: '3 months',
            keySkills: fullJob.requirements || []
          });
        } catch (err) {
          console.error("Failed to fetch full job details", err);
        }
      };
      fetchFullJob();
    } else {
      const draft = localStorage.getItem('hireflow_job_draft');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setJobData(prev => ({ ...prev, ...parsed }));
        } catch (e) { /* ignore */ }
      }
    }
  }, [editingJob]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setJobData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSkill = (e) => {
    if (e) e.preventDefault();
    const skill = keySkillInput.trim();
    if (!skill) return;
    setJobData(prev => prev.keySkills.includes(skill) ? prev : { ...prev, keySkills: [...prev.keySkills, skill] });
    setKeySkillInput('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setJobData(prev => ({ ...prev, keySkills: prev.keySkills.filter(skill => skill !== skillToRemove) }));
  };

  const handleSaveDraft = () => {
    localStorage.setItem('hireflow_job_draft', JSON.stringify(jobData));
    setStatus({ error: '', success: 'Draft saved locally.', loading: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ error: '', success: '', loading: true });

    const contentParts = [];
    contentParts.push(`Required experience: ${jobData.experience}.`);
    if (jobData.screeningInstructions.trim()) contentParts.push(`AI screening instructions: ${jobData.screeningInstructions.trim()}`);

    // Fallbacks
    const description = contentParts.join('\n\n') || "No detailed AI context provided.";

    if (!jobData.title.trim()) {
      return setStatus({ error: 'Job Title is required.', success: '', loading: false });
    }

    try {
      if (editingJob) {
        await jobsAPI.updateJob(editingJob.id, {
          title: jobData.title.trim(),
          department: jobData.department,
          location: jobData.location,
          description,
          requirements: jobData.keySkills
        });
        setStatus({ error: '', success: 'Job updated successfully!', loading: false });
      } else {
        await jobsAPI.createJob({
          title: jobData.title.trim(),
          department: jobData.department,
          location: jobData.location,
          description,
          requirements: jobData.keySkills
        });
        localStorage.removeItem('hireflow_job_draft');
        setStatus({ error: '', success: 'Job created successfully!', loading: false });
      }
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setStatus({ error: err.message || 'Error creating job.', success: '', loading: false });
    }
  };

  return (
    <div className=" mx-auto space-y-6 font-['Inter',sans-serif] py-10 px-32 pb-32">
      <div className="mb-8">
        <h1 className="text-[28px] font-extrabold text-[#202020] tracking-tight mb-1">Job Requirements Setup</h1>
        <p className="text-[14px] text-gray-500 font-medium">Define the parameters for the open position to calibrate the AI screening engine.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {status.error && <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-4 font-medium text-sm">{status.error}</div>}
        {status.success && <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl p-4 font-medium text-sm">{status.success}</div>}

        {/* Card 1: Core Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <div className="flex items-center mb-6">
            <svg className="w-6 h-6 mr-3 text-black" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" /><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" /></svg>
            <h2 className="text-[17px] font-bold text-[#202020]">Core Details</h2>
          </div>
          <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-[13px] font-bold text-[#202020] mb-2">Job Title</label>
              <input name="title" required value={jobData.title} onChange={handleChange} placeholder="e.g., Senior Full Stack Engineer" className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-2 focus:ring-1 focus:ring-gray-400 focus:border-gray-400 font-medium transition-all text-[14px]" />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#202020] mb-2">Department</label>
              <div className="relative">
                <select name="department" value={jobData.department} onChange={handleChange} className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-2 focus:ring-1 focus:ring-gray-400 focus:border-gray-400 font-medium appearance-none transition-all text-[14px] cursor-pointer">
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#202020] mb-2">Required Experience</label>
              <div className="relative">
                <select name="experience" value={jobData.experience} onChange={handleChange} className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-2 focus:ring-1 focus:ring-gray-400 focus:border-gray-400 font-medium appearance-none transition-all text-[14px] cursor-pointer">
                  {EXPERIENCES.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Key Skills */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <div className="flex items-center mb-2">
            <svg className="w-6 h-6 mr-3 text-black" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            <h2 className="text-[17px] font-bold text-[#202020]">Key Skills</h2>
          </div>
          <p className="text-[13px] text-gray-500 font-medium mb-4">Add the most critical skills for candidate matching.</p>

          <div className="flex gap-3 mb-5">
            <input value={keySkillInput} onChange={e => setKeySkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSkill(e)} placeholder="Type a skill..." className="flex-1 bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-2.5 focus:ring-1 focus:ring-gray-400 focus:border-gray-400 font-medium transition-all text-[14px]" />
            <button type="button" onClick={handleAddSkill} className="bg-gray-100 text-gray-600 font-bold w-12 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            {jobData.keySkills.length === 0 && <span className="text-gray-400 text-sm font-medium">No skills listed.</span>}
            {jobData.keySkills.map(skill => (
              <span key={skill} className="inline-flex items-center bg-black text-white font-semibold pl-4 pr-3 py-1.5 rounded-full text-[12px] shadow-sm tracking-wide">
                {skill}
                <button type="button" onClick={() => handleRemoveSkill(skill)} className="ml-2 bg-transparent opacity-60 hover:opacity-100 inline-flex items-center justify-center transition-colors cursor-pointer border-none text-white focus:outline-none">
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Card 3: AI Screening */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <div className="flex items-center mb-3 justify-between">
            <div className="flex items-center">
              <svg className="w-6 h-6 mr-3 text-black" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              <h2 className="text-[17px] font-bold text-[#202020]">AI Screening Instructions</h2>
            </div>
            <span className="bg-[#EEF2FF] border border-[#C7D2FE] text-[#4F46E5] font-bold px-3 py-1.5 rounded text-[10px] tracking-wide uppercase">PREMIUM FEATURE</span>
          </div>
          <p className="text-[13px] text-gray-500 font-medium mb-4">Provide specific context to guide the AI's analysis of applicant resumes.</p>
          <textarea
            name="screeningInstructions"
            rows={4}
            value={jobData.screeningInstructions}
            onChange={handleChange}
            placeholder="Focus heavily on leadership experience..."
            className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:ring-1 focus:ring-gray-400 focus:border-gray-400 font-medium resize-none transition-all text-[14px]"
          ></textarea>
        </div>

        {/* Boundary separator line */}
        <div className="border-t border-gray-200 my-8"></div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4 pt-2">
          {!editingJob && (
            <button type="button" onClick={handleSaveDraft} className="border border-gray-300 px-5 py-2.5 rounded-lg bg-white text-[14px] font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer shadow-sm">
              Save Draft
            </button>
          )}
          <button type="submit" disabled={status.loading} className="bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white font-bold py-2.5 px-6 rounded-lg transition-all flex items-center cursor-pointer shadow-sm">
            {status.loading ? (
              <><svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>{editingJob ? 'Updating...' : 'Saving...'}</>
            ) : (
              <><svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z" /></svg> {editingJob ? 'Update Job' : 'Save & Start AI Analysis'}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateJob;
