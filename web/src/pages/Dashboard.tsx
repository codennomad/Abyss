import { useEffect, useRef, useState } from 'react'
import { api, type ActivityDay, type Metrics, type User } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import ContributionGrid from '../components/ContributionGrid'
import './Dashboard.css'

const CATEGORY_LABELS: Record<string, string> = {
  mind: 'MIND', body: 'BODY', discipline: 'DISCIPLINE',
  social: 'SOCIAL', creative: 'CREATIVE',
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('active') },
      { threshold: 0.08, rootMargin: '0px 0px -4% 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

function RevealBlock({ children, delay = 0, className = '' }: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useReveal()
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

export default function Dashboard() {
  const { setUser } = useAuth()
  const [user, setLocalUser] = useState<User | null>(null)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [activity, setActivity] = useState<ActivityDay[]>([])
  const [loading, setLoading] = useState(true)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([api.metrics.me(), api.metrics.get(), api.metrics.activity()])
      .then(([u, m, a]) => {
        setLocalUser(u)
        setUser(u)
        setMetrics(m)
        setActivity(a)
      })
      .finally(() => setLoading(false))
  }, [setUser])

  useEffect(() => {
    if (!loading && heroRef.current) {
      setTimeout(() => heroRef.current?.classList.add('revealed'), 200)
    }
  }, [loading])

  if (loading) return (
    <div className="dash-loading">
      <span className="mono t-label">LOADING NEURAL DATA</span>
      <div className="dash-loading__bar">
        <div className="dash-loading__fill" />
      </div>
    </div>
  )

  const heat = metrics?.heat ?? 0
  const heatStatus = heat >= 80 ? 'CRITICAL MASS' : heat >= 50 ? 'MOMENTUM BUILDING' : heat >= 20 ? 'WARMING UP' : 'COLD START'
  const maxCatXp = metrics ? Math.max(...Object.values(metrics.logs_by_category), 1) : 1

  return (
    <div className="dashboard">

      {/* ── Row 1: Hero ────────────────────────────────────────────────── */}
      <header className="dash-hero bento-hero" ref={heroRef}>
        <div>
          <div className="section-marker reveal-d1">NEURAL HUB</div>
          <h1 className="t-display">
            <span className="split-line"><span>OPERATIVE</span></span>
            <span className="split-line t-acid"><span>{user?.username?.toUpperCase() ?? '—'}</span></span>
          </h1>
          <p className="t-body-lg dash-hero__sub">
            Track, log, evolve. Your performance matrix is live.
          </p>
        </div>
        <div className="bento-hero__heat">
          <div className="t-label" style={{ color: 'var(--text-4)', marginBottom: 6 }}>HEAT LEVEL</div>
          <div className="heat-value mono t-glow-acid" style={{ fontSize: '3rem', lineHeight: 1 }}>
            {heat.toFixed(1)}<span className="heat-unit" style={{ fontSize: '1.25rem' }}>%</span>
          </div>
          <div className="heat-status" style={{ marginTop: 6 }}>{heatStatus}</div>
          <div className="heat-bar" style={{ marginTop: 12 }}>
            <div className="heat-bar__fill" style={{ width: `${heat}%` }} />
          </div>
        </div>
      </header>

      {/* ── Row 2: Contribution grid ────────────────────────────────────── */}
      {activity.length > 0 && (
        <RevealBlock delay={60}>
          <div className="glass card bento-grid-card">
            <ContributionGrid data={activity} />
          </div>
        </RevealBlock>
      )}

      {/* ── Row 3: Stat cards ───────────────────────────────────────────── */}
      <div className="bento-stats">
        <RevealBlock delay={0} className="bento-stat-wrap">
          <div className="glass stat-card bento-stat">
            <span className="stat-card__label">Total XP</span>
            <span className="stat-card__value mono">{metrics?.total_xp ?? 0}</span>
            <div className="bento-stat__bar" style={{ '--pct': `${Math.min((metrics?.total_xp ?? 0) / 5000 * 100, 100)}%` } as React.CSSProperties} />
          </div>
        </RevealBlock>

        <RevealBlock delay={80} className="bento-stat-wrap">
          <div className="glass stat-card bento-stat">
            <span className="stat-card__label">Streak</span>
            <span className="stat-card__value mono">
              {metrics?.streak_days ?? 0}<span className="stat-unit">d</span>
            </span>
            <div className="bento-stat__sublabel">
              {(metrics?.streak_days ?? 0) >= 7 ? '🔥 On fire' : 'Keep going'}
            </div>
          </div>
        </RevealBlock>

        <RevealBlock delay={160} className="bento-stat-wrap">
          <div className="glass stat-card bento-stat">
            <span className="stat-card__label">Completion</span>
            <span className="stat-card__value mono">
              {((metrics?.completion_rate ?? 0) * 100).toFixed(0)}<span className="stat-unit">%</span>
            </span>
            <div className="bento-stat__bar" style={{ '--pct': `${((metrics?.completion_rate ?? 0) * 100).toFixed(0)}%` } as React.CSSProperties} />
          </div>
        </RevealBlock>
      </div>

      {/* ── Row 4: XP by domain ─────────────────────────────────────────── */}
      {metrics && Object.keys(metrics.logs_by_category).length > 0 && (
        <RevealBlock delay={80}>
          <div className="glass card domain-card">
            <div className="section-marker" style={{ marginBottom: 20 }}>XP BY DOMAIN</div>
            <div className="domain-list">
              {Object.entries(metrics.logs_by_category).map(([cat, xp]) => (
                <div key={cat} className="domain-row">
                  <span className={`badge badge--${cat}`}>{CATEGORY_LABELS[cat] ?? cat}</span>
                  <div className="domain-bar">
                    <div className="domain-bar__fill" style={{ width: `${(xp / maxCatXp) * 100}%` }} />
                  </div>
                  <span className="domain-xp mono t-caption">{xp} XP</span>
                </div>
              ))}
            </div>
          </div>
        </RevealBlock>
      )}

    </div>
  )
}
