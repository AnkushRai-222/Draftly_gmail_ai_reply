const TONES = [
  { value: 'professional', label: 'Professional', desc: 'Clear & polished' },
  { value: 'friendly',     label: 'Friendly',     desc: 'Warm & approachable' },
  { value: 'concise',      label: 'Concise',      desc: 'Brief & direct' },
  { value: 'formal',       label: 'Formal',       desc: 'Structured & official' },
  { value: 'casual',       label: 'Casual',       desc: 'Relaxed & conversational' },
]

export const ToneSelector = ({ value, onChange }) => (
  <div style={styles.grid}>
    {TONES.map(t => (
      <button
        key={t.value}
        onClick={() => onChange(t.value)}
        style={{ ...styles.btn, ...(value === t.value ? styles.active : {}) }}
      >
        <span style={styles.label}>{t.label}</span>
        <span style={styles.desc}>{t.desc}</span>
      </button>
    ))}
  </div>
)

const styles = {
  grid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  btn: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
    padding: '10px 14px', borderRadius: 'var(--radius-md)',
    background: 'var(--bg-base)', border: '1px solid var(--border)',
    cursor: 'pointer', transition: 'all var(--transition)', textAlign: 'left',
    minWidth: 110,
  },
  active: {
    background: 'var(--accent-subtle)', borderColor: 'var(--accent)',
    boxShadow: '0 0 0 1px var(--accent)',
  },
  label: { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-body)' },
  desc:  { fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 },
}
