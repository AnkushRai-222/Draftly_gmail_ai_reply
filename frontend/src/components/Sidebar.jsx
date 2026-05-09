import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'

const navItems = [
  { to: '/dashboard', icon: '✉', label: 'Inbox' },
  { to: '/drafts', icon: '✏', label: 'Drafts' },
  { to: '/logs', icon: '✓', label: 'Sent' },
  { to: '/settings', icon: '⚙', label: 'Settings' },
]

export const Sidebar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      toast('Logged out successfully', 'success')
    } catch {
      toast('Logout failed', 'error')
    } finally {
      setIsLoggingOut(false)
      navigate('/')
    }
  }

  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logo}>
        <span style={styles.logoIcon}>D</span>
        <span style={styles.logoText}>Draftly</span>
      </div>

      {/* Nav */}
      <nav style={styles.nav}>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({ ...styles.navItem, ...(isActive ? styles.navActive : {}) })}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div style={styles.userSection}>
        <div style={styles.userInfo}>
          {user?.picture ? (
            <img
              src={user.picture}
              alt=""
              style={styles.avatar}
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
          ) : null}
          <div style={{ ...styles.avatarFallback, display: user?.picture ? 'none' : 'flex' }}>
            {user?.name?.[0]}
          </div>
          <div style={styles.userText}>
            <div style={styles.userName}>{user?.name}</div>
            <div style={styles.userEmail}>{user?.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            ...styles.logoutBtn,
            ...(isLoggingOut ? styles.logoutBtnDisabled : {}),
          }}
          title="Logout"
          disabled={isLoggingOut}
        >
          {isLoggingOut ? <span className="spinner" style={{ width: 16, height: 16 }} /> : '↪'}
        </button>
      </div>
    </aside>
  )
}

const styles = {
  sidebar: {
    width: 240,
    background: 'var(--bg-surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0, top: 0, bottom: 0,
    zIndex: 100,
    padding: '24px 16px',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '0 8px 28px',
    borderBottom: '1px solid var(--border)',
    marginBottom: 20,
  },
  logoIcon: {
    width: 32, height: 32,
    background: 'var(--accent)',
    color: '#1a1a2e',
    borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem',
  },
  logoText: {
    fontFamily: 'var(--font-display)', fontWeight: 700,
    fontSize: '1.1rem', color: 'var(--text-primary)',
  },
  nav: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 'var(--radius-md)',
    color: 'var(--text-secondary)',
    fontWeight: 500, fontSize: '0.9rem',
    textDecoration: 'none',
    transition: 'all var(--transition)',
  },
  navActive: {
    background: 'var(--accent-subtle)',
    color: 'var(--accent)',
  },
  navIcon: { width: 20, textAlign: 'center', fontSize: '1rem' },
  userSection: {
    marginTop: 'auto', paddingTop: 16,
    borderTop: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  userInfo: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, overflow: 'hidden' },
  avatar: { width: 32, height: 32, borderRadius: '50%', flexShrink: 0 },
  avatarFallback: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'var(--accent-subtle)', color: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: '0.875rem', flexShrink: 0,
  },
  userText: { overflow: 'hidden' },
  userName: {
    fontSize: '0.8rem', fontWeight: 600,
    color: 'var(--text-primary)', whiteSpace: 'nowrap',
    overflow: 'hidden', textOverflow: 'ellipsis',
  },
  userEmail: {
    fontSize: '0.7rem', color: 'var(--text-muted)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  logoutBtn: {
    background: 'none', border: 'none',
    color: 'var(--text-muted)', cursor: 'pointer',
    fontSize: '1rem', padding: 4, flexShrink: 0,
    transition: 'color var(--transition)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoutBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
}
