import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const SharedLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-brand">HireFlow</div>
        <div className="header-actions">
          <button type="button" className="header-button" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-top">
            <div className="sidebar-logo">HF</div>
            <div>
              <p className="sidebar-title">HR Intelligence</p>
            </div>
          </div>

          <nav className="side-nav">
            <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              Dashboard
            </NavLink>
            <NavLink to="/jobs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              Job Positions
            </NavLink>
            <NavLink to="/candidates" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              Candidates
            </NavLink>
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-user">
              <span className="sidebar-user-name">{user?.name || user?.email}</span>
              <span className="sidebar-user-role">HR Team</span>
            </div>
          </div>
        </aside>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SharedLayout;