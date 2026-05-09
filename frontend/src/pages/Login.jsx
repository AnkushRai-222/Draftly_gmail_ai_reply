import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
  const baseUrl = rawBaseUrl.replace(/\/$/, '')

  useEffect(() => {
    if (user) navigate('/dashboard')
  }, [user, navigate])

  const handleGoogleLogin = () => {
    window.location.href = baseUrl ? `${baseUrl}/auth/google` : '/auth/google'
  }

  return (
    <div style={styles.page}>
      {/* Background grid */}
      <div style={styles.grid} />

      <div style={styles.container} className="fade-up">
        {/* Logo */}
        <div style={styles.logoBlock}>
          <div style={styles.logoIcon}>D</div>
          <h1 style={styles.logoText}>Draftly</h1>
          <p style={styles.tagline}>Your Gmail. Drafted by AI.</p>
        </div>

        {/* Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Sign in to continue</h2>
          <p style={styles.cardDesc}>
            Connect your Gmail account to start generating smart email replies with AI.
          </p>

          <button onClick={handleGoogleLogin} style={styles.googleBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div style={styles.disclaimer}>
            <p>Draftly only creates drafts. Nothing is sent without your approval.</p>
          </div>
        </div>

        {/* Feature hints */}
        <div style={styles.features}>
          {['AI-generated reply drafts', 'Your approval before sending', 'Learns your writing style'].map(f => (
            <div key={f} style={styles.featureItem}>
              <span style={styles.featureCheck}>✓</span>
              <span style={styles.featureText}>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-base)', position: 'relative', overflow: 'hidden',
    padding: 24,
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: `
      linear-gradient(var(--border) 1px, transparent 1px),
      linear-gradient(90deg, var(--border) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    opacity: 0.4,
    maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)',
  },
  container: {
    position: 'relative', zIndex: 1,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
    width: '100%', maxWidth: 420,
  },
  logoBlock: { textAlign: 'center' },
  logoIcon: {
    width: 56, height: 56, margin: '0 auto 16px',
    background: 'var(--accent)', color: '#1a1a2e',
    borderRadius: 16, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-display)', fontWeight: 800,
    fontSize: '1.75rem',
    boxShadow: 'var(--shadow-accent)',
  },
  logoText: {
    fontFamily: 'var(--font-display)', fontSize: '2rem',
    fontWeight: 800, color: 'var(--text-primary)', margin: 0,
  },
  tagline: {
    color: 'var(--text-secondary)', marginTop: 8, fontSize: '1rem',
  },
  card: {
    width: '100%', background: 'var(--bg-surface)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)',
    padding: '32px', textAlign: 'center',
    boxShadow: 'var(--shadow-md)',
  },
  cardTitle: {
    fontFamily: 'var(--font-display)', fontSize: '1.25rem',
    marginBottom: 10, color: 'var(--text-primary)',
  },
  cardDesc: { color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 28, lineHeight: 1.6 },
  googleBtn: {
    width: '100%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 12,
    padding: '13px 20px', borderRadius: 'var(--radius-md)',
    background: 'var(--bg-elevated)', color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '0.95rem',
    cursor: 'pointer', transition: 'all var(--transition)',
  },
  disclaimer: {
    marginTop: 20,
    padding: '12px 16px',
    background: 'var(--accent-subtle)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.78rem', color: 'var(--accent)',
  },
  features: { display: 'flex', flexDirection: 'column', gap: 10, width: '100%' },
  featureItem: { display: 'flex', alignItems: 'center', gap: 10 },
  featureCheck: { color: 'var(--green)', fontWeight: 700, fontSize: '0.85rem' },
  featureText: { color: 'var(--text-secondary)', fontSize: '0.85rem' },
}
