import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const navItems = [
  {
    id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: (
      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
    )
  },
  {
    id: 'requirements', path: '/jobs/new', label: 'Requirements', icon: (
      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
    )
  },
  {
    id: 'applicants', path: '/candidates', label: 'Applicants', icon: (
      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    )
  },
  {
    id: 'analysis', path: '/analysis', label: 'Analysis', icon: (
      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
    )
  }
];

const SharedLayout = ({ user, setUser }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('hireflow_token');
    setUser(null);
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-[#F3F4F6] ">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#E5E7EB] flex flex-col text-[#202020] font-['Inter',sans-serif]">

        <div className="h-20 flex items-center px-6">
          <div
            onClick={() => navigate('/dashboard')}
            className="cursor-pointer"
          >
            <span className="text-xl font-bold tracking-tight text-gray-900">HireFlow</span>
          </div>
        </div>

        <nav className="p-4 space-y-1 flex-1 border-t border-[#E5E7EB] pt-6 font-['Inter',sans-serif]">
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-lg text-[14px] font-semibold transition-colors duration-200 cursor-pointer ${isActive
                  ? 'bg-[#F3F4F6] text-black font-bold'
                  : 'text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#202020]'
                }`
              }
            >
              <div className="text-inherit">{item.icon}</div>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-t border-[#E5E7EB] font-['Inter',sans-serif]">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-[#202020] font-bold border border-gray-300">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <div className="ml-3 overflow-hidden text-left">
              <p className="text-sm font-bold text-[#202020] truncate">{user?.name || 'HR Director'}</p>
              <p className="text-xs text-[#6B7280] truncate font-medium">{user?.email || 'HR Director'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-2 py-2 rounded-lg text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            Log Out
          </button>
        </div>

      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default SharedLayout;
