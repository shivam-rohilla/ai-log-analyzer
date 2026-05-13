import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UploadCloud, Clock, Table2, MessageSquare, Menu } from 'lucide-react';

const NAV = [
  { to: '/',         icon: <LayoutDashboard size={17} />, label: 'Dashboard', end: true },
  { to: '/analyze',  icon: <UploadCloud size={17} />,     label: 'Analyze'  },
  { to: '/history',  icon: <Clock size={17} />,           label: 'History'  },
  { to: '/explorer', icon: <Table2 size={17} />,          label: 'Log Explorer' },
  { to: '/chat',     icon: <MessageSquare size={17} />,   label: 'AI Chat'  },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="hamburger" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu size={18} />
      </button>

      <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <NavLink to="/" className="sidebar-logo" onClick={() => setOpen(false)}>
          <div className="logo-hex">L</div>
          <span className="logo-name">LogAI</span>
        </NavLink>

        <nav className="sidebar-nav">
          {NAV.map(({ to, icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-footer-txt">Powered by Groq · LLaMA 3 70b</p>
        </div>
      </aside>
    </>
  );
}
