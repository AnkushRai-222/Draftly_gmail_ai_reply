import { useState, useEffect } from 'react'
import { prefsAPI, styleAPI } from '../services/api'
import { ToneSelector } from '../components/ToneSelector'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'

const FILTER_TYPES = ['sender', 'subject_keyword', 'label']

export default function Settings() {
  const { toasts, toast } = useToast()

  // Preferences
  const [prefs, setPrefs] = useState({ defaultTone: 'professional', signature: '', autoGenerate: false, preferredModel: 'openrouter' })
  const [savingPrefs, setSavingPrefs] = useState(false)

  // Filters
  const [filters, setFilters] = useState([])
  const [newFilter, setNewFilter] = useState({ type: 'sender', value: '', action: 'skip' })
  const [addingFilter, setAddingFilter] = useState(false)

  // Style
  const [styleProfile, setStyleProfile] = useState(null)
  const [learningStyle, setLearningStyle] = useState(false)

  useEffect(() => {
    prefsAPI.get().then(p => p && setPrefs(p)).catch(() => {})
    prefsAPI.getFilters().then(setFilters).catch(() => {})
    styleAPI.get().then(setStyleProfile).catch(() => {})
  }, [])

  const savePrefs = async () => {
    setSavingPrefs(true)
    try {
      const updated = await prefsAPI.update(prefs)
      setPrefs(updated)
      toast('Preferences saved', 'success')
    } catch { toast('Failed to save preferences', 'error') }
    finally { setSavingPrefs(false) }
  }

  const addFilter = async () => {
    if (!newFilter.value.trim()) return
    setAddingFilter(true)
    try {
      const rule = await prefsAPI.addFilter(newFilter)
      setFilters(f => [rule, ...f])
      setNewFilter({ type: 'sender', value: '', action: 'skip' })
      toast('Filter rule added', 'success')
    } catch (err) { toast(err.response?.data?.message || 'Failed to add rule', 'error') }
    finally { setAddingFilter(false) }
  }

  const deleteFilter = async (id) => {
    try {
      await prefsAPI.deleteFilter(id)
      setFilters(f => f.filter(r => r.id !== id))
      toast('Filter rule removed', 'info')
    } catch { toast('Failed to remove rule', 'error') }
  }

  const learnStyle = async (force = false) => {
    setLearningStyle(true)
    try {
      const profile = await styleAPI.learn(force)
      setStyleProfile(profile)
      toast('Style profile updated!', 'success')
    } catch { toast('Style learning failed', 'error') }
    finally { setLearningStyle(false) }
  }

  return (
    <div className="fade-up" style={{ maxWidth: 720 }}>
      <ToastContainer toasts={toasts} />

      <div className="page-header">
        <h1>Settings</h1>
        <p>Customize how Draftly generates and filters your email replies</p>
      </div>

      {/* ── Preferences ─────────────────────────────────────────── */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Reply Preferences</h3>

        <div style={styles.field}>
          <label className="label">Default Tone</label>
          <ToneSelector value={prefs.defaultTone} onChange={t => setPrefs(p => ({ ...p, defaultTone: t }))} />
        </div>

        <div style={styles.field}>
          <label className="label">Email Signature</label>
          <textarea
            className="textarea"
            value={prefs.signature || ''}
            onChange={e => setPrefs(p => ({ ...p, signature: e.target.value }))}
            placeholder="Best regards,&#10;Your Name"
            style={{ minHeight: 80 }}
          />
          <p style={styles.hint}>Auto-appended to every sent reply</p>
        </div>

        <div style={styles.field}>
          <label className="label">Preferred AI Provider</label>
          <select
            className="select"
            value={prefs.preferredModel}
            onChange={e => setPrefs(p => ({ ...p, preferredModel: e.target.value }))}
          >
            <option value="openrouter">OpenRouter (Llama 3.3 / DeepSeek)</option>
            <option value="gemini">Google Gemini 1.5 Flash</option>
          </select>
        </div>

        <div style={styles.toggleRow}>
          <div>
            <div style={styles.toggleLabel}>Auto-generate drafts</div>
            <div style={styles.toggleDesc}>Automatically create a draft when new emails arrive</div>
          </div>
          <button
            onClick={() => setPrefs(p => ({ ...p, autoGenerate: !p.autoGenerate }))}
            style={{ ...styles.toggle, ...(prefs.autoGenerate ? styles.toggleOn : {}) }}
          >
            <div style={{ ...styles.toggleKnob, ...(prefs.autoGenerate ? styles.toggleKnobOn : {}) }} />
          </button>
        </div>

        <button className="btn btn-primary" onClick={savePrefs} disabled={savingPrefs}>
          {savingPrefs ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</> : 'Save Preferences'}
        </button>
      </section>

      <hr className="divider" />

      {/* ── Filter Rules ─────────────────────────────────────────── */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Email Filter Rules</h3>
        <p style={styles.sectionDesc}>
          Control which emails get AI drafts. <strong style={{ color: 'var(--accent)' }}>Allow</strong> rules override system filters. <strong style={{ color: 'var(--red)' }}>Skip</strong> rules block AI drafts.
        </p>

        {/* Add new rule */}
        <div style={styles.addRule}>
          <select
            className="select"
            value={newFilter.type}
            onChange={e => setNewFilter(f => ({ ...f, type: e.target.value }))}
            style={{ width: 160 }}
          >
            {FILTER_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
          <input
            className="input"
            value={newFilter.value}
            onChange={e => setNewFilter(f => ({ ...f, value: e.target.value }))}
            placeholder={newFilter.type === 'sender' ? 'e.g. boss@company.com' : newFilter.type === 'label' ? 'e.g. CATEGORY_PROMOTIONS' : 'e.g. invoice'}
            style={{ flex: 1 }}
            onKeyDown={e => e.key === 'Enter' && addFilter()}
          />
          <select
            className="select"
            value={newFilter.action}
            onChange={e => setNewFilter(f => ({ ...f, action: e.target.value }))}
            style={{ width: 100 }}
          >
            <option value="skip">Skip</option>
            <option value="allow">Allow</option>
          </select>
          <button className="btn btn-secondary" onClick={addFilter} disabled={addingFilter || !newFilter.value.trim()}>
            {addingFilter ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '+ Add'}
          </button>
        </div>

        {/* Rules list */}
        {filters.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No custom rules. System filters (OTP, promo, etc.) are always active.</p>
        ) : (
          <div style={styles.rulesList}>
            {filters.map(rule => (
              <div key={rule.id} style={styles.ruleRow}>
                <span style={styles.ruleType}>{rule.type.replace('_', ' ')}</span>
                <span style={styles.ruleValue}>{rule.value}</span>
                <span style={{ ...styles.ruleAction, color: rule.action === 'allow' ? 'var(--green)' : 'var(--red)' }}>
                  {rule.action}
                </span>
                <button onClick={() => deleteFilter(rule.id)} style={styles.deleteBtn}>✕</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="divider" />

      {/* ── Style Profile ─────────────────────────────────────────── */}
      <section style={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={styles.sectionTitle}>Writing Style Profile</h3>
            <p style={styles.sectionDesc}>
              Draftly learns your tone from past sent emails to make drafts sound more like you.
            </p>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => learnStyle(true)}
            disabled={learningStyle}
            style={{ flexShrink: 0 }}
          >
            {learningStyle ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Analyzing…</> : '↺ Re-analyze'}
          </button>
        </div>

        {styleProfile ? (
          <div style={styles.styleGrid}>
            {Object.entries(styleProfile.inferredStyle || {}).map(([key, val]) => (
              <div key={key} style={styles.stylePill}>
                <span style={styles.styleKey}>{key}</span>
                <span style={styles.styleVal}>
                  {Array.isArray(val) ? val.join(', ') : String(val)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No style profile yet.</p>
            <button className="btn btn-secondary btn-sm" onClick={() => learnStyle(false)} disabled={learningStyle}>
              {learningStyle ? 'Analyzing…' : 'Analyze My Emails'}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

const styles = {
  section: { marginBottom: 8 },
  sectionTitle: { fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: 6 },
  sectionDesc: { color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 20, lineHeight: 1.6 },
  field: { marginBottom: 20 },
  hint: { fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 },
  toggleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: 20 },
  toggleLabel: { fontWeight: 500, fontSize: '0.9rem' },
  toggleDesc: { fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 },
  toggle: { width: 44, height: 24, borderRadius: 99, background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer', position: 'relative', transition: 'all var(--transition)', flexShrink: 0 },
  toggleOn: { background: 'var(--accent)', borderColor: 'var(--accent)' },
  toggleKnob: { position: 'absolute', top: 3, left: 3, width: 16, height: 16, borderRadius: '50%', background: 'var(--text-muted)', transition: 'all var(--transition)' },
  toggleKnobOn: { left: 23, background: '#0e0f11' },
  addRule: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  rulesList: { display: 'flex', flexDirection: 'column', gap: 6 },
  ruleRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' },
  ruleType: { fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 4 },
  ruleValue: { flex: 1, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' },
  ruleAction: { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  deleteBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem', padding: 4 },
  styleGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  stylePill: { display: 'flex', gap: 12, padding: '8px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', alignItems: 'baseline' },
  styleKey: { fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--accent)', width: 140, flexShrink: 0 },
  styleVal: { color: 'var(--text-secondary)', lineHeight: 1.5 },
}
