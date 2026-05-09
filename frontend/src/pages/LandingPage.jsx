import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import '../landing.css'

export default function LandingPage() {
  const navigate = useNavigate()
  const animRefs = useRef([])

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.15 }
    )
    animRefs.current.forEach(el => el && obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const addRef = (el) => { if (el && !animRefs.current.includes(el)) animRefs.current.push(el) }
  const goLogin = () => navigate('/login')

  return (
    <div className="landing-page">
      {/* ── Navbar ── */}
      <nav className="lp-nav">
        <a href="/" className="lp-nav-logo">
          <div className="lp-nav-logo-icon">D</div>
          Draftly
        </a>
        <ul className="lp-nav-links">
          <li><a href="#how-it-works">How It Works</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#security">Security</a></li>
        </ul>
        <button className="lp-nav-cta" onClick={goLogin}>Get Started</button>
      </nav>

      {/* ── Section 1: Hero ── */}
      <section className="lp-section lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-text">
            <div className="lp-hero-badge lp-animate" ref={addRef}>
              <span className="lp-hero-badge-dot" />
              AI-Powered Email Assistant
            </div>
            <h1 className="lp-animate lp-animate-delay-1" ref={addRef}>
              Your Gmail.<br /><span>Drafted by AI.</span>
            </h1>
            <p className="lp-hero-desc lp-animate lp-animate-delay-2" ref={addRef}>
              Draftly reads your inbox, understands context, and generates perfect reply drafts — all waiting for your approval before anything is sent.
            </p>
            <div className="lp-hero-actions lp-animate lp-animate-delay-3" ref={addRef}>
              <button className="lp-btn-primary" onClick={goLogin}>
                Start Drafting →
              </button>
              <a href="#how-it-works" className="lp-btn-secondary">See How It Works</a>
            </div>
          </div>
          <div className="lp-hero-visual lp-animate lp-animate-delay-2" ref={addRef}>
            <div className="lp-mockup">
              <div className="lp-mockup-glow" />
              <div className="lp-mockup-header">
                <div className="lp-mockup-dots">
                  <span style={{ background: '#ff5f57' }} />
                  <span style={{ background: '#ffbd2e' }} />
                  <span style={{ background: '#28c840' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#9a9db0', marginLeft: 8 }}>Draftly — Inbox</span>
              </div>
              <div className="lp-mockup-body">
                <div className="lp-mockup-email">
                  <div className="lp-mockup-email-from">Sarah Johnson</div>
                  <div className="lp-mockup-email-subject">Re: Q3 Budget Review — Can we discuss the revised allocations?</div>
                </div>
                <div className="lp-mockup-draft">
                  <div className="lp-mockup-draft-label">✨ AI Draft Ready</div>
                  <div className="lp-mockup-draft-text">
                    Hi Sarah, thanks for sending over the revised allocations. I've reviewed the numbers and they look aligned with our targets. Happy to jump on a quick call this afternoon to finalize. Let me know what time works best!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: How It Works ── */}
      <section className="lp-section lp-how" id="how-it-works">
        <div className="lp-section-inner">
          <div className="lp-section-tag lp-animate" ref={addRef}>◆ How It Works</div>
          <h2 className="lp-section-title lp-animate lp-animate-delay-1" ref={addRef}>
            Three steps to effortless replies
          </h2>
          <p className="lp-section-desc lp-animate lp-animate-delay-2" ref={addRef}>
            From inbox to sent — Draftly handles the heavy lifting while you stay in control.
          </p>
          <div className="lp-steps">
            {[
              { num: '1', title: 'Connect Your Gmail', desc: 'Sign in with Google and Draftly securely syncs your inbox. No passwords stored, ever.' },
              { num: '2', title: 'AI Drafts Your Replies', desc: 'Draftly reads each email, understands context and tone, and writes a tailored reply draft for you.' },
              { num: '3', title: 'You Review & Send', desc: 'Edit, approve, or regenerate any draft. Nothing leaves your inbox without your explicit approval.' },
            ].map((step, i) => (
              <div key={i} className={`lp-step lp-animate lp-animate-delay-${i + 1}`} ref={addRef}>
                <div className="lp-step-num">{step.num}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
                {i < 2 && <div className="lp-step-connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: Feature — Smart Filtering ── */}
      <section className="lp-section lp-feature" id="features" style={{ background: '#fff' }}>
        <div className="lp-section-inner">
          <div className="lp-feature-grid">
            <div className="lp-feature-content">
              <div className="lp-feature-icon lp-animate" ref={addRef}>🔍</div>
              <h2 className="lp-animate lp-animate-delay-1" ref={addRef}>Smart Email Filtering</h2>
              <p className="lp-animate lp-animate-delay-2" ref={addRef}>
                Draftly automatically sorts through your inbox, filtering out promotions, OTPs, newsletters, and automated messages — so you only see emails that actually need a reply.
              </p>
              <ul className="lp-feature-list lp-animate lp-animate-delay-3" ref={addRef}>
                <li><span className="check">✓</span> Auto-filters spam & promotions</li>
                <li><span className="check">✓</span> Skips OTP & verification codes</li>
                <li><span className="check">✓</span> Custom filter rules you define</li>
              </ul>
            </div>
            <div className="lp-feature-visual lp-animate lp-animate-delay-2" ref={addRef}>
              <div className="lp-feature-card">
                <div className="lp-feature-card-header">📥 Inbox Filter</div>
                <div className="lp-feature-card-body">
                  <div className="lp-filter-item lp-filter-pass"><span className="lp-filter-icon">✉️</span> Sarah Johnson — Q3 Budget Review</div>
                  <div className="lp-filter-item lp-filter-pass"><span className="lp-filter-icon">✉️</span> Mike Chen — Project Update</div>
                  <div className="lp-filter-item lp-filter-block"><span className="lp-filter-icon">🚫</span> no-reply@promo.com — 50% OFF!</div>
                  <div className="lp-filter-item lp-filter-block"><span className="lp-filter-icon">🚫</span> OTP: Your code is 482910</div>
                  <div className="lp-filter-item lp-filter-pass"><span className="lp-filter-icon">✉️</span> Lisa Park — Team Standup Notes</div>
                  <div className="lp-filter-item lp-filter-block"><span className="lp-filter-icon">🚫</span> newsletter@updates.io — Weekly Digest</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: Feature — AI Drafts ── */}
      <section className="lp-section lp-feature" style={{ background: 'var(--lp-bg-soft)' }}>
        <div className="lp-section-inner">
          <div className="lp-feature-grid reverse">
            <div className="lp-feature-content">
              <div className="lp-feature-icon lp-animate" ref={addRef}>✨</div>
              <h2 className="lp-animate lp-animate-delay-1" ref={addRef}>AI-Powered Draft Generation</h2>
              <p className="lp-animate lp-animate-delay-2" ref={addRef}>
                Choose a tone — professional, friendly, concise, or custom — and Draftly generates a context-aware reply that sounds just like you.
              </p>
              <ul className="lp-feature-list lp-animate lp-animate-delay-3" ref={addRef}>
                <li><span className="check">✓</span> Multiple tone options</li>
                <li><span className="check">✓</span> Context-aware responses</li>
                <li><span className="check">✓</span> Thread-aware — reads full conversation</li>
              </ul>
            </div>
            <div className="lp-feature-visual lp-animate lp-animate-delay-2" ref={addRef}>
              <div className="lp-feature-card">
                <div className="lp-feature-card-header">✨ Draft Generator</div>
                <div className="lp-feature-card-body">
                  <div className="lp-tone-chips">
                    <span className="lp-tone-chip active">Professional</span>
                    <span className="lp-tone-chip">Friendly</span>
                    <span className="lp-tone-chip">Concise</span>
                    <span className="lp-tone-chip">Custom</span>
                  </div>
                  <div className="lp-draft-preview">
                    Hi Sarah,<br /><br />
                    Thank you for sharing the revised allocations. I've reviewed the updated figures and everything aligns well with our Q3 objectives. I'm available for a brief call this afternoon to finalize the details.<br /><br />
                    Best regards
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Feature — Style Learning ── */}
      <section className="lp-section lp-feature" style={{ background: '#fff' }}>
        <div className="lp-section-inner">
          <div className="lp-feature-grid">
            <div className="lp-feature-content">
              <div className="lp-feature-icon lp-animate" ref={addRef}>🎨</div>
              <h2 className="lp-animate lp-animate-delay-1" ref={addRef}>Your Style, Your Voice</h2>
              <p className="lp-animate lp-animate-delay-2" ref={addRef}>
                Draftly learns from your sent emails to understand your unique writing style — vocabulary, sentence structure, and tone. Every draft sounds authentically you.
              </p>
              <ul className="lp-feature-list lp-animate lp-animate-delay-3" ref={addRef}>
                <li><span className="check">✓</span> Learns from your writing history</li>
                <li><span className="check">✓</span> Adapts to your vocabulary</li>
                <li><span className="check">✓</span> Matches your natural tone</li>
              </ul>
            </div>
            <div className="lp-feature-visual lp-animate lp-animate-delay-2" ref={addRef}>
              <div className="lp-feature-card">
                <div className="lp-feature-card-header">🎨 Your Style Profile</div>
                <div className="lp-feature-card-body">
                  {[
                    { label: 'Formality', value: '72%', width: '72%' },
                    { label: 'Warmth', value: '85%', width: '85%' },
                    { label: 'Brevity', value: '60%', width: '60%' },
                    { label: 'Signature Phrases', value: '45%', width: '45%' },
                  ].map((m, i) => (
                    <div key={i} className="lp-style-meter">
                      <div className="lp-style-meter-label">
                        <span>{m.label}</span><span>{m.value}</span>
                      </div>
                      <div className="lp-style-meter-bar">
                        <div className="lp-style-meter-fill" style={{ width: m.width }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 6: Feature — Review & Control ── */}
      <section className="lp-section lp-feature" style={{ background: 'var(--lp-bg-soft)' }}>
        <div className="lp-section-inner">
          <div className="lp-feature-grid reverse">
            <div className="lp-feature-content">
              <div className="lp-feature-icon lp-animate" ref={addRef}>🛡️</div>
              <h2 className="lp-animate lp-animate-delay-1" ref={addRef}>You're Always in Control</h2>
              <p className="lp-animate lp-animate-delay-2" ref={addRef}>
                Every draft goes through you. Approve it as-is, edit it to perfection, reject it entirely, or ask for a fresh take. Nothing gets sent without your say.
              </p>
              <ul className="lp-feature-list lp-animate lp-animate-delay-3" ref={addRef}>
                <li><span className="check">✓</span> Approve, edit, reject, or regenerate</li>
                <li><span className="check">✓</span> Full draft history & audit trail</li>
                <li><span className="check">✓</span> Human-in-the-loop always</li>
              </ul>
            </div>
            <div className="lp-feature-visual lp-animate lp-animate-delay-2" ref={addRef}>
              <div className="lp-feature-card">
                <div className="lp-feature-card-header">📋 Draft Review</div>
                <div className="lp-feature-card-body">
                  <div className="lp-draft-preview" style={{ marginBottom: 16 }}>
                    Hi Sarah, thanks for the update. The revised numbers look great and align with our Q3 targets. Let's connect this afternoon to finalize...
                  </div>
                  <div className="lp-review-actions">
                    <span className="lp-review-btn lp-review-approve">✓ Approve</span>
                    <span className="lp-review-btn lp-review-edit">✎ Edit</span>
                    <span className="lp-review-btn lp-review-reject">✕ Reject</span>
                    <span className="lp-review-btn lp-review-regen">↻ Regenerate</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 7: Feature — One-Click Send ── */}
      <section className="lp-section lp-feature" style={{ background: '#fff' }}>
        <div className="lp-section-inner">
          <div className="lp-feature-grid">
            <div className="lp-feature-content">
              <div className="lp-feature-icon lp-animate" ref={addRef}>🚀</div>
              <h2 className="lp-animate lp-animate-delay-1" ref={addRef}>One-Click Send & Track</h2>
              <p className="lp-animate lp-animate-delay-2" ref={addRef}>
                Approved drafts are sent directly through your Gmail — maintaining proper email threading and conversation context. Track every sent reply in your activity log.
              </p>
              <ul className="lp-feature-list lp-animate lp-animate-delay-3" ref={addRef}>
                <li><span className="check">✓</span> Sends via your Gmail account</li>
                <li><span className="check">✓</span> Preserves email threads</li>
                <li><span className="check">✓</span> Complete activity history</li>
              </ul>
            </div>
            <div className="lp-feature-visual lp-animate lp-animate-delay-2" ref={addRef}>
              <div className="lp-feature-card">
                <div className="lp-feature-card-header">📊 Activity Log</div>
                <div className="lp-feature-card-body">
                  {[
                    { to: 'Sarah Johnson', subject: 'Q3 Budget Review', time: '2 min ago', status: 'Sent ✓' },
                    { to: 'Mike Chen', subject: 'Project Update', time: '15 min ago', status: 'Sent ✓' },
                    { to: 'Lisa Park', subject: 'Standup Notes', time: '1 hour ago', status: 'Sent ✓' },
                  ].map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--lp-border)' : 'none',
                      fontSize: '0.82rem'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--lp-text)' }}>{item.to}</div>
                        <div style={{ color: 'var(--lp-text-muted)', fontSize: '0.75rem' }}>{item.subject}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#2e7d32', fontWeight: 600 }}>{item.status}</div>
                        <div style={{ color: 'var(--lp-text-muted)', fontSize: '0.72rem' }}>{item.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 8: Trust & Security ── */}
      <section className="lp-section lp-trust" id="security" style={{ background: 'var(--lp-bg-soft)' }}>
        <div className="lp-section-inner" style={{ textAlign: 'center' }}>
          <div className="lp-section-tag lp-animate" ref={addRef} style={{ justifyContent: 'center' }}>🔒 Trust & Security</div>
          <h2 className="lp-section-title lp-animate lp-animate-delay-1" ref={addRef}>
            Your privacy is non-negotiable
          </h2>
          <p className="lp-section-desc lp-animate lp-animate-delay-2" ref={addRef} style={{ margin: '0 auto 48px' }}>
            Draftly is built with security-first principles. Your data stays yours.
          </p>
          <div className="lp-trust-grid">
            {[
              { icon: '🔐', title: 'End-to-End Encryption', desc: 'All email data and credentials are encrypted with military-grade encryption at rest and in transit.' },
              { icon: '👤', title: 'Human-in-the-Loop', desc: 'No email is ever sent automatically. Every draft requires your explicit review and approval.' },
              { icon: '🚫', title: 'No Data Selling', desc: 'Your email content is never shared, sold, or used for advertising. Period.' },
            ].map((card, i) => (
              <div key={i} className={`lp-trust-card lp-animate lp-animate-delay-${i + 1}`} ref={addRef}>
                <div className="lp-trust-icon">{card.icon}</div>
                <h3>{card.title}</h3>
                <p>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 9: Final CTA ── */}
      <section className="lp-section lp-cta">
        <div className="lp-cta-inner">
          <h2 className="lp-animate" ref={addRef}>Ready to draft smarter?</h2>
          <p className="lp-animate lp-animate-delay-1" ref={addRef}>
            Join thousands of professionals who save hours every week with AI-powered email drafts.
          </p>
          <div className="lp-animate lp-animate-delay-2" ref={addRef}>
            <button className="lp-btn-primary" onClick={goLogin} style={{ fontSize: '1.1rem', padding: '16px 40px' }}>
              Get Started Free →
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-brand">
          <div className="lp-nav-logo-icon" style={{ width: 28, height: 28, fontSize: '0.85rem', borderRadius: 8 }}>D</div>
          © 2026 Draftly. All rights reserved.
        </div>
        <div className="lp-footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Contact</a>
        </div>
      </footer>
    </div>
  )
}
