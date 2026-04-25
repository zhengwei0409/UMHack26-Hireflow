import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { buttonSecondaryClassName } from '../styles/buttonStyles';

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
        <path fill="currentColor" d="M4 4h5v5H4V4Zm7 0h5v5h-5V4ZM4 11h5v5H4v-5Zm7 0h5v5h-5v-5Z" />
      </svg>
    ),
  },
  {
    to: '/jobs',
    label: 'Jobs',
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
        <path fill="currentColor" d="M5 5h10v2H5V5Zm0 4h7v2H5V9Zm0 4h10v2H5v-2Zm10.2-4.4 1.4 1.4-3.4 3.4-1.7-1.7 1.4-1.4.3.3 2-2Z" />
      </svg>
    ),
  },
  {
    to: '/candidates',
    label: 'Applicants',
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
        <path fill="currentColor" d="M7.5 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm0 1.5c3 0 5.5 1.4 5.5 3.1V16H2v-1.4c0-1.7 2.5-3.1 5.5-3.1Zm6.1-1.3a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Zm.4 1.3c2.2.2 4 1.3 4 2.7V16h-3.5v-1.4c0-1.1-.6-2.1-1.5-2.8.3-.1.7-.2 1-.3Z" />
      </svg>
    ),
  },
  {
    to: '/ranked-shortlist',
    label: 'Ranked Shortlist',
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
        <path fill="currentColor" d="M10 2l2.4 4.8L18 7.6l-4 3.9.9 5.5L10 14.5l-4.9 2.5.9-5.5-4-3.9 5.6-.8L10 2Z" />
      </svg>
    ),
  },
  {
    to: '/bias-audit',
    label: 'Bias Audit',
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
        <path fill="currentColor" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12zm-1-5h2v4H9v-4zm0-6h2v2H9V5z" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
        <path fill="currentColor" fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.533 1.533 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
    ),
  },
  ];

const getInitial = (user) => (user?.name || user?.email || 'HF').slice(0, 1).toUpperCase();

const SharedLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="hidden h-screen flex-col overflow-y-auto border-r border-zinc-200 bg-white lg:sticky lg:top-0 lg:flex">
          <div className="border-b border-zinc-200 px-5 py-5">
            <Link to="/dashboard" className="flex items-center gap-3">
              <span className="auth-logo-mark relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md bg-black text-white transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(17,24,39,0.22)]">
                <span className="pointer-events-none absolute inset-0 auth-logo-glow" aria-hidden="true" />
                <svg viewBox="0 0 20 20" className="relative h-5 w-5 transition duration-300 hover:scale-105" aria-hidden="true">
                  <path fill="currentColor" d="M4 4h5v5H4V4Zm7 0h5v5h-5V4ZM4 11h5v5H4v-5Zm7 0h5v5h-5v-5Z" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-extrabold leading-tight">HireFlow</span>
        
              </span>
            </Link>
          </div>

          <nav className="grid gap-1 px-4 py-5">
            {navItems.map((item) => (
              <NavLink
                key={`${item.label}-${item.to}`}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition ${
                    isActive ? 'bg-zinc-100 text-black' : 'text-zinc-600 hover:bg-zinc-50 hover:text-black'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto border-t border-zinc-200 px-4 py-5">
            <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                {getInitial(user)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold">{user?.name || user?.email || 'HireFlow User'}</span>
                <span className="block truncate text-xs font-medium text-zinc-500">HR Director</span>
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className={`mt-3 w-full gap-2 ${buttonSecondaryClassName}`}
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                <path fill="currentColor" d="M8 3h7a1 1 0 0 1 1 1v3h-2V5H8v10h6v-2h2v3a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-3H3v-2h4V9H3V7h4V4a1 1 0 0 1 1-1Zm6.6 5.4L17.2 11l-2.6 2.6-1.4-1.4.2-.2H9v-2h4.4l-.2-.2 1.4-1.4Z" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
                <span className="auth-logo-mark relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-md bg-black text-white transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(17,24,39,0.22)]">
                  <span className="pointer-events-none absolute inset-0 auth-logo-glow" aria-hidden="true" />
                  <svg viewBox="0 0 20 20" className="relative h-5 w-5 transition duration-300 hover:scale-105" aria-hidden="true">
                    <path fill="currentColor" d="M4 4h5v5H4V4Zm7 0h5v5h-5V4ZM4 11h5v5H4v-5Zm7 0h5v5h-5v-5Z" />
                  </svg>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold leading-tight">HireFlow</span>
        
                </span>
              </Link>

              <div className="flex items-center gap-2">
                <Link
                  to="/jobs"
                  className="primary-cta grid h-9 w-9 place-items-center rounded-md transition"
                  aria-label="Post new job"
                  title="Post new job"
                >
                  <span className="text-xl leading-none">+</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="grid h-9 w-9 place-items-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 hover:text-black focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
                  aria-label="Logout"
                  title="Logout"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                    <path fill="currentColor" d="M8 3h7a1 1 0 0 1 1 1v3h-2V5H8v10h6v-2h2v3a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-3H3v-2h4V9H3V7h4V4a1 1 0 0 1 1-1Zm6.6 5.4L17.2 11l-2.6 2.6-1.4-1.4.2-.2H9v-2h4.4l-.2-.2 1.4-1.4Z" />
                  </svg>
                </button>
              </div>
            </div>

            <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {navItems.map((item) => (
                <NavLink
                  key={`mobile-${item.label}-${item.to}`}
                  to={item.to}
                  className={({ isActive }) =>
                    `inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs font-semibold tracking-[-0.01em] transition ${
                      isActive ? 'bg-black !text-white' : 'border border-zinc-200 bg-white text-zinc-600 hover:text-black'
                    }`
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </header>

          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default SharedLayout;
