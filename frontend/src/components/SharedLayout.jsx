import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const navItems = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: (
      <path d="M4 4h4.25v4.25H4zM11.75 4H16v4.25h-4.25zM4 11.75h4.25V16H4zM11.75 11.75H16V16h-4.25z" />
    ),
  },
  {
    label: 'Requirements',
    to: '/jobs',
    icon: (
      <>
        <path d="M4 5.25h12M4 10h12M4 14.75h12" />
        <path d="m7.25 7.25-1.5-1.5 1.5-1.5M7.25 12l-1.5-1.5L7.25 9" />
      </>
    ),
  },
  {
    label: 'Applicants',
    to: '/candidates',
    icon: (
      <>
        <path d="M6.8 15.25v-.9A3.2 3.2 0 0 1 10 11.15a3.2 3.2 0 0 1 3.2 3.2v.9" />
        <path d="M10 9.4a2.45 2.45 0 1 0 0-4.9 2.45 2.45 0 0 0 0 4.9Z" />
        <path d="M14.2 10.1a2.55 2.55 0 0 1 2.05 2.5v.7" />
      </>
    ),
  },
  {
    label: 'Analysis',
    to: '/dashboard',
    icon: (
      <>
        <path d="M4.75 14.75 8 11.5l2.3 2.3 4.95-6.55" />
        <path d="M13.25 7.25h2v2" />
        <circle cx="8" cy="11.5" r="1" />
      </>
    ),
  },
];

const NavIcon = ({ children }) => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const SharedLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#f2f3f5] font-sans text-[#202020]">
      <div className="grid min-h-screen lg:grid-cols-[244px_minmax(0,1fr)]">
        <aside className="flex border-b border-[#d9d9d9] bg-white lg:min-h-screen lg:flex-col lg:border-b-0 lg:border-r">
          <div className="flex w-full flex-col gap-5 p-4 lg:h-full lg:px-3 lg:py-5">
            <div className="flex items-center gap-3 px-1">
              <div className="grid h-9 w-9 place-items-center rounded-sm bg-[#202020] text-white">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10 3.25 11.4 7l4.1-1.1-2.2 3.45 3.45 2.2-4.1 1.1L13.75 17 10 14.6 6.25 17l1.1-4.35-4.1-1.1 3.45-2.2L4.5 5.9 8.6 7 10 3.25Z" />
                </svg>
              </div>
              <div className="leading-none">
                <p className="text-sm font-extrabold tracking-normal text-[#202020]">HireFlow</p>
                <p className="mt-1 text-[11px] font-semibold text-[#646464]">HR Intelligence</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/jobs')}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-sm bg-[#050505] px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#202020]"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M8 3.5v9M3.5 8h9" />
              </svg>
              Post New Job
            </button>

            <nav className="flex gap-1 overflow-x-auto lg:grid lg:overflow-visible" aria-label="Primary navigation">
              {navItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'flex h-10 shrink-0 items-center gap-3 rounded-sm px-3 text-xs font-bold transition',
                      isActive ? 'bg-[#eeeeee] text-[#202020]' : 'text-[#555555] hover:bg-[#f4f4f4] hover:text-[#202020]',
                    ].join(' ')
                  }
                >
                  <NavIcon>{item.icon}</NavIcon>
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto hidden border-t border-[#e5e5e5] pt-4 lg:block">
             
              <div className="mt-4 flex items-center gap-3 px-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-[#202020] text-xs font-bold text-white">
                  {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-[#202020]">{user?.name || user?.email || 'Sarah Jenkins'}</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#707070]">HR Director</p>
                </div>
              </div>

              <button type="button" onClick={handleLogout} className="mt-3 h-8 w-full rounded-sm px-3 text-left text-xs font-bold text-[#707070] transition hover:bg-[#f4f4f4] hover:text-[#202020]">
                Log Out
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SharedLayout;
