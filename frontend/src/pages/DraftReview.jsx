import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { draftsAPI } from '../services/api'
import { ToneSelector } from '../components/ToneSelector'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'

export default function DraftReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toasts, toast } = useToast()

  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [tone, setTone] = useState('professional')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState(null) // 'approve'|'reject'|'send'|'regenerate'

  useEffect(() => {
    draftsAPI.getOne(id)
      .then(d => { setDraft(d); setContent(d.content); setTone(d.tone) })
      .catch(() => { toast('Draft not found', 'error'); navigate('/drafts') })
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await draftsAPI.update(id, { content, tone })
      setDraft(updated)
      setEditing(false)
      toast('Draft saved', 'success')
    } catch { toast('Failed to save', 'error') }
    finally { setSaving(false) }
  }

  const handleAction = async (action) => {
    setActing(action)
    try {
      if (action === 'approve') {
        await draftsAPI.approve(id)
        setDraft(d => ({ ...d, status: 'approved' }))
        toast('Draft approved — ready to send', 'success')
      } else if (action === 'reject') {
        await draftsAPI.reject(id)
        setDraft(d => ({ ...d, status: 'rejected' }))
        toast('Draft rejected', 'info')
      } else if (action === 'send') {
        await draftsAPI.send(id)
        setDraft(d => ({ ...d, status: 'sent' }))
        toast('Email queued for sending! ✓', 'success')
      } else if (action === 'regenerate') {
        const result = await draftsAPI.regenerate(id, tone)
        setDraft(result.data)
        setContent(result.data.content)
        setTone(result.data.tone)
        toast(`Regenerated with ${result.data.aiProvider}`, 'info')
      }
    } catch (err) {
      toast(err.response?.data?.message || `Failed: ${action}`, 'error')
    } finally { setActing(null) }
  }

  if (loading) return (
    <div style={{ paddingTop: 80, textAlign: 'center' }}>
      <div className="spinner" style={{ margin: '0 auto', width: 32, height: 32 }} />
    </div>
  )

  if (!draft) return null

  const canApprove = ['pending', 'edited'].includes(draft.status)
  const canSend    = draft.status === 'approved'
  const canEdit    = !['sent'].includes(draft.status)
  const isSent     = draft.status === 'sent'

  return (
    <div className="fade-up" style={styles.page}>
      <ToastContainer toasts={toasts} />

      {/* Back + title */}
      <div style={styles.topBar}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
        <div style={styles.statusRow}>
          <span className={`badge badge-${draft.status}`}>{draft.status}</span>
          <span style={styles.aiTag}>{draft.aiProvider} / {draft.aiModel?.split('/').pop()?.split(':')[0]}</span>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Left — original email */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelLabel}>Original Email</span>
          </div>
          <div style={styles.emailMeta}>
            <div style={styles.metaRow}>
              <span style={styles.metaKey}>From</span>
              <span style={styles.metaVal}>{draft.email?.sender} &lt;{draft.email?.senderEmail}&gt;</span>
            </div>
            <div style={styles.metaRow}>
              <span style={styles.metaKey}>Subject</span>
              <span style={styles.metaVal}>{draft.email?.subject}</span>
            </div>
            <div style={styles.metaRow}>
              <span style={styles.metaKey}>Received</span>
              <span style={styles.metaVal}>{new Date(draft.email?.receivedAt).toLocaleString()}</span>
            </div>
          </div>
          <hr className="divider" />
          <div style={styles.emailBody}>{draft.email?.body}</div>
        </div>

        {/* Right — draft editor */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelLabel}>AI Draft Reply</span>
            {canEdit && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setEditing(e => !e)}
              >
                {editing ? '✕ Cancel' : '✏ Edit'}
              </button>
            )}
          </div>

          {/* Tone selector */}
          <div style={{ marginBottom: 16 }}>
            <div className="label">Tone</div>
            <ToneSelector value={tone} onChange={canEdit ? setTone : undefined} />
          </div>

          {/* Draft content */}
          {editing ? (
            <textarea
              className="textarea"
              value={content}
              onChange={e => setContent(e.target.value)}
              style={{ minHeight: 260, fontFamily: 'var(--font-body)', fontSize: '0.9rem', lineHeight: 1.8 }}
            />
          ) : (
            <div style={styles.draftBody}>{content}</div>
          )}

          {/* Signature preview */}
          {draft.user?.preference?.signature && (
            <div style={styles.signaturePreview}>
              <span style={styles.signatureLabel}>Signature (auto-appended)</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                {draft.user.preference.signature}
              </span>
            </div>
          )}

          {/* Action buttons */}
          {!isSent && (
            <div style={styles.actions}>
              {editing ? (
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</> : '✓ Save Changes'}
                </button>
              ) : (
                <>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleAction('regenerate')}
                    disabled={!!acting}
                  >
                    {acting === 'regenerate' ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '↺'}
                    Regenerate
                  </button>

                  {canApprove && (
                    <button
                      className="btn btn-success"
                      onClick={() => handleAction('approve')}
                      disabled={!!acting}
                    >
                      {acting === 'approve' ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '✓'}
                      Approve
                    </button>
                  )}

                  {canSend && (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleAction('send')}
                      disabled={!!acting}
                    >
                      {acting === 'send' ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '↗'}
                      Send Reply
                    </button>
                  )}

                  {canApprove && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleAction('reject')}
                      disabled={!!acting}
                    >
                      Reject
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {isSent && (
            <div style={styles.sentBanner}>
              <span style={{ fontSize: '1.2rem' }}>✓</span>
              <span>Email sent successfully</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { maxWidth: 1200 },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  statusRow: { display: 'flex', alignItems: 'center', gap: 10 },
  aiTag: { fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)', padding: '3px 8px', borderRadius: 6 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  panel: { background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  panelLabel: { fontFamily: 'var(--font-mono)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' },
  emailMeta: { display: 'flex', flexDirection: 'column', gap: 8 },
  metaRow: { display: 'flex', gap: 12, alignItems: 'baseline' },
  metaKey: { fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', width: 60, flexShrink: 0 },
  metaVal: { fontSize: '0.85rem', color: 'var(--text-secondary)' },
  emailBody: { fontSize: '0.875rem', lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto' },
  draftBody: { fontSize: '0.9rem', lineHeight: 1.8, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', background: 'var(--bg-base)', padding: 16, borderRadius: 'var(--radius-md)', minHeight: 200 },
  signaturePreview: { display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 14px', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--border)' },
  signatureLabel: { fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 'auto' },
  sentBanner: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: 'var(--green-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--green)', fontWeight: 600 },
}
