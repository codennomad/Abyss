import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Layout.css'

const NAV = [
  { to: '/',          icon: '◈', label: 'HUB',       end: true },
  { to: '/protocols', icon: '⬡', label: 'PROTOCOLS', end: false },
  { to: '/logs',      icon: '▤', label: 'HISTORY',   end: false },
  { to: '/settings',  icon: '◎', label: 'SETTINGS',  end: false },
]

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="layout scanlines">
      {/* Ambient background */}
      <div className="bg-grid" />
      <div className="noise-overlay" />
      <div className="liquid-blob" style={{ width: 520, height: 520, top: -120, left: -120, background: '#b000ff', opacity: 0.12, animationDuration: '18s' }} />
      <div className="liquid-blob" style={{ width: 380, height: 380, top: '45%', right: -80, background: '#5500cc', opacity: 0.08, animationDuration: '24s', animationDelay: '-8s' }} />
      <div className="liquid-blob" style={{ width: 600, height: 600, bottom: -160, left: '25%', background: '#2200aa', opacity: 0.06, animationDuration: '30s', animationDelay: '-14s' }} />

      {/* Desktop sidebar */}
      <aside className="sidebar glass-static">
        <div className="sidebar__logo">
          <span className="sidebar__logo-text mono glitch t-glow-acid" data-text="ABYSS">ABYSS</span>
          <span className="sidebar__logo-sub t-micro">HABIT UNDERGROUND</span>
        </div>

        <nav className="sidebar__nav">
          {NAV.map(({ to, icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
            >
              <span className="nav-link__icon">{icon}</span>
              <span>{label === 'HUB' ? 'NEURAL HUB' : label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          {user && (
            <div className="sidebar__user">
              <div className="sidebar__user-dot" />
              <span className="mono t-caption">{user.username}</span>
            </div>
          )}
          <button className="btn btn-danger btn-sm" onClick={logout}>DISCONNECT</button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="bottom-nav">
        {NAV.map(({ to, icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `bottom-nav__link ${isActive ? 'bottom-nav__link--active' : ''}`}
          >
            <span className="bottom-nav__icon">{icon}</span>
            <span className="bottom-nav__label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
