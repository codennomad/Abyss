import { useEffect, useRef, useState } from 'react'
import { api, type LogStatus, type Protocol, type ProtocolCategory } from '../lib/api'
import './Protocols.css'

const CATEGORIES: ProtocolCategory[] = ['mind', 'body', 'discipline', 'social', 'creative']

const EMPTY_FORM = {
  name: '',
  description: '',
  category: 'discipline' as ProtocolCategory,
  frequency_days: 1,
  xp_reward: 10,
}

function RevealItem({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('active') },
      { threshold: 0.1 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className="reveal" style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

function formatLastLogged(iso: string | null): string {
  if (!iso) return 'Never'
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays}d ago`
}

export default function Protocols() {
  const [protocols, setProtocols] = useState<Protocol[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [logStatus, setLogStatus] = useState<Record<string, LogStatus | null>>({})
  const [filter, setFilter] = useState<'all' | 'due'>('due')

  useEffect(() => {
    api.protocols.list().then(setProtocols).finally(() => setLoading(false))
  }, [])

  function setField<K extends keyof typeof EMPTY_FORM>(k: K, v: (typeof EMPTY_FORM)[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    try {
      const p = await api.protocols.create({
        name: form.name,
        description: form.description || null,
        category: form.category,
        frequency_days: form.frequency_days,
        xp_reward: form.xp_reward,
      })
      setProtocols(ps => [p, ...ps])
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Deploy failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLog(p: Protocol, status: LogStatus) {
    setLogStatus(s => ({ ...s, [p.id]: status }))
    try {
      await api.protocols.createLog({ protocol_id: p.id, status })
      // mark as no longer due after logging done
      if (status === 'done') {
        setProtocols(ps => ps.map(x =>
          x.id === p.id ? { ...x, is_due: false, last_logged_at: new Date().toISOString() } : x
        ))
      }
    } catch {
      setLogStatus(s => ({ ...s, [p.id]: null }))
    }
  }

  async function handleToggle(p: Protocol) {
    const updated = await api.protocols.update(p.id, { is_active: !p.is_active })
    setProtocols(ps => ps.map(x => x.id === p.id ? updated : x))
  }

  async function handleDelete(p: Protocol) {
    await api.protocols.delete(p.id)
    setProtocols(ps => ps.filter(x => x.id !== p.id))
  }

  if (loading) return (
    <div className="proto-loading">
      <span className="mono t-label">LOADING PROTOCOLS</span>
    </div>
  )

  const active = protocols.filter(p => p.is_active)
  const paused = protocols.filter(p => !p.is_active)
  const dueCount = active.filter(p => p.is_due).length

  const displayed = filter === 'due'
    ? protocols.filter(p => p.is_active && p.is_due)
    : protocols

  return (
    <div className="protocols">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="proto-header">
        <div>
          <div className="section-marker">PROTOCOLS</div>
          <p className="t-body" style={{ marginTop: 4 }}>
            <span className="mono" style={{ color: 'var(--acid)' }}>{active.length}</span> active
            {paused.length > 0 && <span style={{ color: 'var(--text-4)' }}> · {paused.length} paused</span>}
            {dueCount > 0 && (
              <span style={{ color: 'var(--warn)', marginLeft: 6 }}>· {dueCount} due</span>
            )}
          </p>
        </div>
        <button
          className={`btn ${showForm ? 'btn-ghost' : 'btn-solid'}`}
          onClick={() => setShowForm(v => !v)}
        >
          {showForm ? '✕ CANCEL' : '+ NEW PROTOCOL'}
        </button>
      </div>

      {/* ── Filter tabs ─────────────────────────────────────────────── */}
      <div className="proto-filters">
        <button
          className={`filter-tab ${filter === 'due' ? 'filter-tab--active' : ''}`}
          onClick={() => setFilter('due')}
        >
          DUE TODAY
          {dueCount > 0 && <span className="filter-badge">{dueCount}</span>}
        </button>
        <button
          className={`filter-tab ${filter === 'all' ? 'filter-tab--active' : ''}`}
          onClick={() => setFilter('all')}
        >
          ALL
        </button>
      </div>

      {/* ── Create form ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="proto-form glass-accent card reveal active">
          <div className="t-label" style={{ color: 'var(--acid)', marginBottom: 20 }}>
            INITIALIZE PROTOCOL
          </div>
          <form onSubmit={handleCreate} className="proto-form__inner">
            <div className="proto-form__grid">
              <div className="field">
                <label className="field__label">Name</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="e.g. Morning Cold Shower"
                  required maxLength={120}
                />
              </div>
              <div className="field">
                <label className="field__label">Category</label>
                <select className="input" value={form.category}
                  onChange={e => setField('category', e.target.value as ProtocolCategory)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field__label">Frequency (every N days)</label>
                <input className="input" type="number" min={1} max={365}
                  value={form.frequency_days}
                  onChange={e => setField('frequency_days', Number(e.target.value))} />
              </div>
              <div className="field">
                <label className="field__label">XP Reward</label>
                <input className="input" type="number" min={1} max={1000}
                  value={form.xp_reward}
                  onChange={e => setField('xp_reward', Number(e.target.value))} />
              </div>
            </div>
            <div className="field">
              <label className="field__label">Description (optional)</label>
              <input className="input" value={form.description}
                onChange={e => setField('description', e.target.value)}
                placeholder="What does this protocol involve?" maxLength={300} />
            </div>
            {formError && <p className="proto-error">{formError}</p>}
            <button className="btn btn-solid" type="submit" disabled={submitting}>
              {submitting ? 'DEPLOYING...' : 'DEPLOY PROTOCOL'}
            </button>
          </form>
        </div>
      )}

      {/* ── Empty states ─────────────────────────────────────────────── */}
      {displayed.length === 0 && (
        <div className="proto-empty glass card">
          {filter === 'due' && dueCount === 0 && active.length > 0 ? (
            <>
              <span className="mono t-label" style={{ color: 'var(--ok)' }}>ALL CAUGHT UP</span>
              <p className="t-body" style={{ marginTop: 8, color: 'var(--text-3)' }}>
                No protocols due right now. Check back later.
              </p>
            </>
          ) : (
            <>
              <span className="mono t-label" style={{ color: 'var(--acid)' }}>NO DIRECTIVES FOUND</span>
              <p className="t-body" style={{ marginTop: 8 }}>Initialize your first protocol above.</p>
            </>
          )}
        </div>
      )}

      {/* ── Protocol cards ───────────────────────────────────────────── */}
      <div className="proto-list">
        {displayed.map((p, i) => {
          const logged = logStatus[p.id]
          return (
            <RevealItem key={p.id} delay={i * 35}>
              <div className={`glass proto-card ${!p.is_active ? 'proto-card--inactive' : ''} ${p.is_due && p.is_active ? 'proto-card--due' : ''}`}>
                <div className="proto-card__top">
                  <div className="proto-card__meta">
                    {p.is_due && p.is_active && (
                      <span className="due-dot" title="Due now" />
                    )}
                    <span className={`badge badge--${p.category}`}>{p.category.toUpperCase()}</span>
                    <span className="mono t-caption" style={{ color: 'var(--text-4)' }}>
                      every {p.frequency_days}d
                    </span>
                  </div>
                  <div className="proto-card__actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => handleToggle(p)}>
                      {p.is_active ? 'PAUSE' : 'RESUME'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p)}>
                      DEL
                    </button>
                  </div>
                </div>

                <h3 className="proto-card__name t-h3">{p.name}</h3>
                {p.description && <p className="proto-card__desc t-sm">{p.description}</p>}

                <div className="proto-card__footer">
                  <div className="proto-card__footer-left">
                    <span className="mono t-caption" style={{ color: 'var(--acid)' }}>
                      +{p.xp_reward} XP
                    </span>
                    <span className="mono t-caption" style={{ color: 'var(--text-4)' }}>
                      last: {formatLastLogged(p.last_logged_at)}
                    </span>
                  </div>

                  {p.is_active && (
                    <div className="log-actions">
                      {logged ? (
                        <span className={`status--${logged} mono t-caption`}>{logged.toUpperCase()} ✓</span>
                      ) : (
                        <>
                          <button className="log-btn log-btn--done" onClick={() => handleLog(p, 'done')}>DONE</button>
                          <button className="log-btn log-btn--failed" onClick={() => handleLog(p, 'failed')}>FAIL</button>
                          <button className="log-btn log-btn--skipped" onClick={() => handleLog(p, 'skipped')}>SKIP</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </RevealItem>
          )
        })}
      </div>
    </div>
  )
}
