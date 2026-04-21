import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Sun, Moon, Settings, CalendarDays, DollarSign, Bell, GraduationCap, Inbox, Sparkles } from 'lucide-react'
import { useApp } from '../../lib/AppContext'
import './Layout.css'

const NAV = [
  { to: '/today',     icon: Sparkles,     label: 'Today' },
  { to: '/capture',   icon: Inbox,        label: 'Capture' },
  { to: '/academic',  icon: GraduationCap,label: 'Academic' },
  { to: '/finance',   icon: DollarSign,   label: 'Finance' },
  { to: '/calendar',  icon: CalendarDays, label: 'Calendar' },
  { to: '/reminders', icon: Bell,         label: 'Reminders' },
]

export default function Layout() {
  const { settings, toggleTheme } = useApp()
  const location = useLocation()
  const current = NAV.find(n => location.pathname.startsWith(n.to))

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-mark" />
          <span className="logo-text">Life OS</span>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="theme-btn" onClick={toggleTheme} title="Toggle theme">
            {settings.theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={16} />
            <span>Settings</span>
          </NavLink>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-title">
            <span>{current?.label || 'Life OS'}</span>
          </div>
          <div className="topbar-right">
            <button className="theme-btn mobile-theme" onClick={toggleTheme}>
              {settings.theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      <nav className="mobile-bar">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `mobile-item ${isActive ? 'active' : ''}`}>
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
