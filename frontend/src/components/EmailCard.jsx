import { useNavigate } from 'react-router-dom'

const STATUS_LABEL = {
  pending: 'Draft pending',
  approved: 'Approved',
  edited: 'Draft edited',
  sent: 'Sent',
  rejected: 'Rejected',
  failed: 'Send failed',
}

const timeAgo = (dateStr) => {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export const EmailCard = ({ email, onGenerate, generating }) => {
  const navigate = useNavigate()
  const draft = email.draft

  const handleClick = () => {
    if (draft) navigate(`/drafts/${draft.id}`)
  }

  return (
    <div
      style={{
        ...styles.card,
        cursor: draft ? 'pointer' : 'default',
        borderLeft: draft ? '3px solid var(--accent)' : '3px solid transparent',
      }}
      onClick={handleClick}
    >
      <div style={styles.top}>
        <div style={styles.sender}>
          <div style={styles.avatar}>{email.sender?.[0]?.toUpperCase() || '?'}</div>
          <div>
            <div style={styles.senderName}>{email.sender}</div>
            <div style={styles.senderEmail}>{email.senderEmail}</div>
          </div>
        </div>
        <div style={styles.meta}>
          {draft && <span className={`badge badge-${draft.status}`}>{STATUS_LABEL[draft.status]}</span>}
          <span style={styles.time}>{timeAgo(email.receivedAt)}</span>
        </div>
      </div>

      <div style={styles.subject}>{email.subject}</div>
      <div style={styles.snippet}>{email.snippet}</div>

      {!draft && (
        <div style={styles.actions} onClick={e => e.stopPropagation()}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onGenerate(email.id)}
            disabled={generating === email.id}
          >
            {generating === email.id
              ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Generating…</>
              : '✦ Generate Draft'
            }
          </button>
        </div>
      )}
    </div>
  )
}

const styles = {
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '18px 20px',
    transition: 'all var(--transition)',
    marginBottom: 10,
  },
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  sender: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: {
    width: 34, height: 34, borderRadius: '50%',
    background: 'var(--accent-subtle)', color: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
  },
  senderName: { fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' },
  senderEmail: { fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 },
  meta: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  time: { fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
  subject: { fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 },
  snippet: { fontSize: '0.825rem', color: 'var(--text-secondary)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  actions: { marginTop: 12, display: 'flex', gap: 8 },
}
