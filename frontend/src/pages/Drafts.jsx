import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { draftsAPI } from '../services/api'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'

const STATUS_FILTERS = ['all', 'pending', 'approved', 'edited', 'sent', 'rejected']

const timeAgo = (d) => {
  const diff = (Date.now() - new Date(d)) / 1000
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function Drafts() {
  const [drafts, setDrafts] = useState([])
  const [status, setStatus] = useState('all')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { toasts, toast } = useToast()

  useEffect(() => {
    setLoading(true)
    draftsAPI.list({ status: status === 'all' ? undefined : status })
      .then(d => setDrafts(d.drafts || []))
      .catch(() => toast('Failed to load drafts', 'error'))
      .finally(() => setLoading(false))
  }, [status])

  return (
    <div className="fade-up">
      <ToastContainer toasts={toasts} />
      <div style={styles.header}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem' }}>Drafts</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
            Review and manage your AI-generated replies
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={styles.tabs}>
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            style={{ ...styles.tab, ...(status === s ? styles.tabActive : {}) }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ paddingTop: 40, textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : drafts.length === 0 ? (
        <div className="empty-state">
          <div className="icon">✏</div>
          <h3>No drafts yet</h3>
          <p>Go to Inbox and click "Generate Draft" on an email to get started.</p>
        </div>
      ) : (
        <div>
          {drafts.map(draft => (
            <div
              key={draft.id}
              style={styles.row}
              onClick={() => navigate(`/drafts/${draft.id}`)}
            >
              <div style={styles.rowLeft}>
                <div style={styles.emailInfo}>
                  <span style={styles.sender}>{draft.email?.sender}</span>
                  <span style={styles.subject}>{draft.email?.subject}</span>
                </div>
                <div style={styles.draftPreview}>
                  {draft.content?.substring(0, 120)}…
                </div>
              </div>
              <div style={styles.rowRight}>
                <span className={`badge badge-${draft.status}`}>{draft.status}</span>
                <span style={styles.time}>{timeAgo(draft.updatedAt)}</span>
                <span style={styles.provider}>{draft.aiProvider}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  tabs: { display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' },
  tab: {
    padding: '7px 14px', borderRadius: 'var(--radius-md)',
    background: 'none', border: '1px solid var(--border)',
    color: 'var(--text-secondary)', cursor: 'pointer',
    fontSize: '0.8rem', fontFamily: 'var(--font-body)', fontWeight: 500,
    transition: 'all var(--transition)',
  },
  tabActive: {
    background: 'var(--accent-subtle)', color: 'var(--accent)',
    borderColor: 'var(--accent)',
  },
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    gap: 16, padding: '16px 20px',
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', marginBottom: 8, cursor: 'pointer',
    transition: 'all var(--transition)',
  },
  rowLeft: { flex: 1, overflow: 'hidden' },
  emailInfo: { display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 6 },
  sender: { fontWeight: 600, fontSize: '0.875rem', flexShrink: 0 },
  subject: { color: 'var(--text-secondary)', fontSize: '0.825rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  draftPreview: { fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  time: { fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
  provider: { fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 },
}
