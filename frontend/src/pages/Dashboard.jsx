import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, jobsAPI } from '../services/api.js';

const Dashboard = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, jobId: null });
  const [viewType, setViewType] = useState('grid');

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const d = new Date(isoString);
    if (isNaN(d.valueOf())) return isoString;
    return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}, ${d.getFullYear()}`;
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const payload = await dashboardAPI.getDashboardData();
        setDashboard(payload.data);
      } catch (err) {
        setError(err.message || 'Unable to fetch dashboard metrics.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const confirmDelete = async () => {
    if (!deleteModal.jobId) return;
    try {
      await jobsAPI.deleteJob(deleteModal.jobId);
      const payload = await dashboardAPI.getDashboardData();
      setDashboard(payload.data);
    } catch (err) {
      setError(err.message || 'Error deleting job.');
    } finally {
      setDeleteModal({ isOpen: false, jobId: null });
    }
  };

  const handleEdit = (position) => {
    navigate('/jobs/new', { state: { job: position } });
  };

  const metrics = dashboard?.metrics ?? {
    openRoles: 0,
    totalApplicants: 0,
    screenedResumes: 0,
  };
  const positions = dashboard?.positions ?? [];

  return (
    <div className="h-full flex flex-col font-['Inter',sans-serif]">

      {/* Top Header Section matched to the image */}
      <div className="bg-white border-b border-[#E5E7EB] py-4 px-8 flex justify-between items-center shrink-0">
        <h1 className="text-xl font-bold text-[#202020]">Active Requirements</h1>

        <div className="flex items-center space-x-6">
          <div className="relative w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              placeholder="Search positions..."
              className="w-full bg-[#F3F4F6] text-sm text-gray-900 border border-[#E5E7EB] rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-gray-400 focus:bg-white transition-all"
            />
          </div>

          <button className="text-gray-400 hover:text-black transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
          </button>
          <button className="text-gray-400 hover:text-black transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
          </button>
        </div>
      </div>

      <div className="p-8 flex-1">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 font-medium rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {/* Top 3 KPI Dashboard Widgets exactly matching the mockup */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 flex items-center shadow-sm">
            <div className="w-12 h-12 rounded bg-[#F3F4F6] flex items-center justify-center text-gray-700 mr-5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" /><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" /></svg>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Active Roles</p>
              <h3 className="text-2xl font-bold text-[#202020]">{metrics.openRoles}</h3>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 flex items-center shadow-sm">
            <div className="w-12 h-12 rounded bg-[#F3F4F6] flex items-center justify-center text-gray-700 mr-5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Total Applicants</p>
              <h3 className="text-2xl font-bold text-[#202020]">{metrics.totalApplicants}</h3>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 flex items-center shadow-sm">
            <div className="w-12 h-12 rounded bg-[#F3F4F6] flex items-center justify-center text-gray-700 mr-5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">AI Screened</p>
              <h3 className="text-2xl font-bold text-[#202020]">{metrics.screenedResumes || 0}</h3>
            </div>
          </div>

        </div>

        {/* Table Section matching Mockup */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">

          <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-[#202020]">Open Positions</h2>
            <div className="flex items-center space-x-3">

              {/* Layout Switcher */}
              <div className="flex items-center border border-gray-300 rounded overflow-hidden">
                <button
                  onClick={() => setViewType('grid')}
                  className={`px-3 py-2 flex items-center justify-center cursor-pointer transition-colors ${viewType === 'grid' ? 'bg-gray-100 text-black' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                  title="Card View"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zm9-8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z" clipRule="evenodd" /></svg>
                </button>
                <div className="w-[1px] h-5 bg-gray-300"></div>
                <button
                  onClick={() => setViewType('table')}
                  className={`px-3 py-2 flex items-center justify-center cursor-pointer transition-colors ${viewType === 'table' ? 'bg-gray-100 text-black' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                  title="Table View"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                </button>
              </div>

              <button className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-[13px] font-bold py-2 px-3 rounded transition-colors cursor-pointer flex items-center shadow-sm">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                Filter
              </button>

              <button
                onClick={() => navigate('/jobs/new')}
                className="bg-black hover:bg-gray-800 text-white text-[13px] font-bold py-2 px-4 rounded transition-colors cursor-pointer flex items-center"
              >
                + Post New Job
              </button>
            </div>
          </div>

          {viewType === 'table' ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                      <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Job Title & Department</th>
                      <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Applicants</th>
                      <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Date Posted</th>
                      <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">AI Screening</th>
                      <th className="py-3 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {positions.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-12 text-center text-sm text-gray-500">No open positions found. Click "Post New Job" to get started.</td>
                      </tr>
                    ) : positions.map((position) => (
                      <tr key={position.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-5">
                          <p onClick={() => handleEdit(position)} className="font-bold text-[13px] text-[#202020] cursor-pointer hover:underline">{position.title}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5">{position.department} </p>
                        </td>
                        <td className="py-4 px-5">
                          <span className="font-bold text-[13px] text-[#202020]">{position.applicants || 0}</span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="text-[12px] text-gray-600 font-medium">
                            {formatDate(position.createdAt)}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#1A3077] mr-2"></div>
                            <span className="text-[11px] font-bold text-[#1A3077]">Active</span>
                          </div>
                          <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-[#1A3077] w-[100%] rounded-full"></div>
                          </div>
                        </td>
                        <td className="py-4 px-5 text-right flex justify-end items-center space-x-2">
                          <button onClick={() => handleEdit(position)} className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-50 cursor-pointer shadow-sm transition-colors" title="Edit Job">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => setDeleteModal({ isOpen: true, jobId: position.id })} className="w-7 h-7 rounded border border-red-200 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer shadow-sm transition-colors" title="Delete Job">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-[#E5E7EB] flex items-center justify-between text-[12px] text-gray-500 bg-white">
                <p>Showing 1 to {positions.length > 4 ? 4 : positions.length} of {positions.length} entries</p>
                <div className="flex space-x-1">
                  <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
                    <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 cursor-pointer">
                    <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 bg-white min-h-[400px]">
              {positions.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-12">No open positions found. Click "+ Post New Job" to get started.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {positions.map(position => (
                    <div key={position.id} className="relative bg-white border border-[#E5E7EB] rounded-[14px] p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col group overflow-hidden">
                      {/* Top Right Triangle Fold */}
                      <div className="absolute top-0 right-0 border-t-[28px] border-l-[28px] border-t-[#F3F4F6] border-l-transparent pointer-events-none"></div>

                      {/* Header */}
                      <div className="flex justify-between items-start mb-4 relative z-10">
                        <span className="bg-[#F3F4F6] text-[#202020] text-[10.5px] font-extrabold px-3 py-1.5 rounded-full select-none">
                          {position.department}
                        </span>

                        {/* 3 Dots menu toggling edit directly as a quick fix */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(position); }}
                          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-black cursor-pointer -mt-1 -mr-1"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                        </button>
                      </div>

                      {/* Title & Location */}
                      <h3
                        onClick={() => handleEdit(position)}
                        className="text-[17px] font-extrabold text-[#202020] mb-2 leading-[1.3] cursor-pointer group-hover:text-black hover:underline relative z-10"
                      >
                        {position.title}
                      </h3>
                      <div className="flex items-center text-gray-500 text-[12px] font-bold mb-8">
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {position.location || 'Remote / US'}
                      </div>

                      {/* Footer Stats & Status Bar */}
                      <div className="mt-auto border-t border-[#F3F4F6] pt-5">
                        <div className="flex justify-between items-end mb-4">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-0.5">Applicants</p>
                            <p className="text-[26px] font-black leading-none text-[#202020]">{position.applicants || 0}</p>
                          </div>

                          <div className="text-right flex flex-col items-end">
                            <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1">Status</p>
                            <div className="flex items-center text-[12px] font-bold text-[#202020]">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#202020] mr-1.5"></div>
                              Reviewing
                            </div>
                          </div>
                        </div>

                        {/* Status Segmentation Bar matching image segments */}
                        <div className="flex space-x-1.5 w-full">
                          <div className="h-1.5 bg-[#202020] rounded-full flex-1"></div>
                          <div className="h-1.5 bg-gray-200 rounded-full flex-[1.5]"></div>
                          <div className="h-1.5 bg-gray-200 rounded-full flex-[1.5]"></div>
                          <div className="h-1.5 bg-gray-200 rounded-full flex-[1.5]"></div>
                        </div>

                      </div>

                      {/* Extra Delete Layer shown purely on hover, transparent otherwise */}
                      <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
                        <button onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, jobId: position.id }); }} className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shadow-sm transition-colors" title="Delete Job">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-40 filter backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6 max-w-sm w-full mx-4 transform scale-100 transition-transform">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 mr-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">Delete Job</h2>
            </div>
            <p className="text-sm text-gray-500 mb-6 font-medium">Are you sure you want to delete this job requirement? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ isOpen: false, jobId: null })}
                className="px-4 py-2.5 text-sm font-bold text-gray-600 hover:text-black border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm rounded-lg transition-colors cursor-pointer"
              >
                Delete Job
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
