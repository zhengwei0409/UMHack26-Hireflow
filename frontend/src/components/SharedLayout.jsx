import React from 'react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'positions', label: 'Job Positions' },
  { id: 'candidates', label: 'Candidates' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'settings', label: 'Settings' }
];

const SharedLayout = ({ user, activePage, onNavigate, onLogout, children }) => {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-brand">HireFlow</div>
        <div className="header-actions">
          {/* <div className="search-box">
            <input type="search" placeholder="Search resumes, jobs, candidates..." />
          </div> */}
          <button type="button" className="header-button" onClick={onLogout}>
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
              {/* <p className="sidebar-subtitle">Shared workspace for hiring teams</p> */}
            </div>
          </div>

          <nav className="side-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-user">
              <span className="sidebar-user-name">{user?.name || user?.email}</span>
              <span className="sidebar-user-role">Hiring lead</span>
            </div>
          </div>
        </aside>

        <main className="page-content">{children}</main>
      </div>
    </div>
  );
};

export default SharedLayout;
