import { useState, useEffect } from 'react'
import { emailsAPI, draftsAPI } from '../services/api'
import { EmailCard } from '../components/EmailCard'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'

export default function Dashboard() {
  const [emails, setEmails] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(null)
  const [showFiltered, setShowFiltered] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { toasts, toast } = useToast()

  const loadEmails = async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true)
      const data = await emailsAPI.list({ maxResults: 30, refresh })
      setEmails(data.emails || [])
      setFiltered(data.filtered || [])
    } catch {
      toast('Failed to load emails', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadEmails() }, [])

  const handleGenerate = async (emailId) => {
    setGenerating(emailId)
    try {
      await draftsAPI.generate(emailId)
      toast('Draft generated!', 'success')
      await loadEmails()
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to generate draft', 'error')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="fade-up">
      <ToastContainer toasts={toasts} />

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Inbox</h1>
          <p style={styles.sub}>{emails.length} emails ready for drafts</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => loadEmails(true)}
          disabled={refreshing}
        >
          {refreshing ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '↻'}
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={styles.skeletons}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={styles.skeletonCard}>
              <div className="skeleton" style={{ width: 34, height: 34, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: '40%', height: 14, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: '70%', height: 12 }} />
              </div>
            </div>
          ))}
        </div>
      ) : emails.length === 0 ? (
        <div className="empty-state">
          <div className="icon">✉</div>
          <h3>All caught up</h3>
          <p>No actionable emails found. Try refreshing or check your filter settings.</p>
        </div>
      ) : (
        <div>
          {emails.map(email => (
            <EmailCard
              key={email.id}
              email={email}
              onGenerate={handleGenerate}
              generating={generating}
            />
          ))}
        </div>
      )}

      {/* Filtered emails section */}
      {filtered.length > 0 && (
        <div style={styles.filteredSection}>
          <button
            style={styles.filteredToggle}
            onClick={() => setShowFiltered(v => !v)}
          >
            <span style={{ color: 'var(--text-muted)' }}>
              {showFiltered ? '▾' : '▸'}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {filtered.length} filtered emails (promo / OTP / automated)
            </span>
          </button>

          {showFiltered && (
            <div style={styles.filteredList}>
              {filtered.map(email => (
                <div key={email.id} style={styles.filteredItem}>
                  <div style={styles.filteredDot} />
                  <div style={{ flex: 1 }}>
                    <span style={styles.filteredSender}>{email.sender}</span>
                    <span style={styles.filteredSubject}> — {email.subject}</span>
                  </div>
                  <span style={styles.filteredReason}>{email.filterReason}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  title: { fontFamily: 'var(--font-display)', fontSize: '1.75rem' },
  sub: { color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 },
  skeletons: { display: 'flex', flexDirection: 'column', gap: 10 },
  skeletonCard: {
    display: 'flex', gap: 12, alignItems: 'center',
    padding: '18px 20px', background: 'var(--bg-surface)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
  },
  filteredSection: { marginTop: 32 },
  filteredToggle: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0',
  },
  filteredList: {
    marginTop: 10, border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', overflow: 'hidden',
  },
  filteredItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 14px', borderBottom: '1px solid var(--border)',
    fontSize: '0.8rem',
  },
  filteredDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: 'var(--text-muted)', flexShrink: 0,
  },
  filteredSender: { color: 'var(--text-secondary)', fontWeight: 600 },
  filteredSubject: { color: 'var(--text-muted)' },
  filteredReason: {
    marginLeft: 'auto', color: 'var(--text-muted)',
    fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
    flexShrink: 0, maxWidth: 160, textAlign: 'right',
  },
}
