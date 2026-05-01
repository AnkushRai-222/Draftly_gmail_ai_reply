import { useState, useEffect } from 'react'
import { draftsAPI } from '../services/api'

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    setLoading(true)
    draftsAPI.logs({ page, limit: 20 })
      .then(d => { setLogs(d.logs || []); setTotalPages(d.totalPages || 1) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="fade-up">
      <div className="page-header">
        <h1>Sent History</h1>
        <p>All emails sent through Draftly</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : logs.length === 0 ? (
        <div className="empty-state">
          <div className="icon">✉</div>
          <h3>Nothing sent yet</h3>
          <p>Emails you approve and send will appear here.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {logs.map(log => (
              <div key={log.id} style={styles.row}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1rem' }}>{log.success ? '✅' : '❌'}</span>
                  <div>
                    <div style={styles.subject}>
                      Re: {log.draft?.email?.subject}
                    </div>
                    <div style={styles.to}>To {log.draft?.email?.sender}</div>
                  </div>
                </div>
                <div style={styles.right}>
                  {log.success ? (
                    <span className="badge badge-sent">Sent</span>
                  ) : (
                    <span className="badge badge-failed">Failed</span>
                  )}
                  <span style={styles.time}>
                    {log.sentAt ? new Date(log.sentAt).toLocaleString() : '—'}
                  </span>
                  {log.errorMessage && (
                    <span style={styles.error}>{log.errorMessage}</span>
                  )}
                  <span style={styles.attempts}>{log.attemptCount} attempt{log.attemptCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Page {page} of {totalPages}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const styles = {
  row: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 18px', background: 'var(--bg-surface)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', gap: 12,
  },
  subject: { fontWeight: 600, fontSize: '0.875rem' },
  to: { fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: 2 },
  right: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  time: { fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
  error: { fontSize: '0.7rem', color: 'var(--red)', maxWidth: 200, textAlign: 'right' },
  attempts: { fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 24 },
}
