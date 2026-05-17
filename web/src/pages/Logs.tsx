import { useEffect, useState } from 'react'
import { api, type ProtocolLog } from '../lib/api'
import './Logs.css'

const STATUS_LABEL: Record<string, string> = { done: 'DONE', failed: 'FAILED', skipped: 'SKIPPED' }

function groupByDate(logs: ProtocolLog[]): [string, ProtocolLog[]][] {
  const groups: Record<string, ProtocolLog[]> = {}
  for (const log of logs) {
    const date = new Date(log.logged_at)
    const key = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(log)
  }
  return Object.entries(groups)
}

function isToday(isoStr: string): boolean {
  const d = new Date(isoStr)
  const now = new Date()
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

function isYesterday(isoStr: string): boolean {
  const d = new Date(isoStr)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear()
}

function friendlyDate(key: string, firstLog: string): string {
  if (isToday(firstLog)) return 'Today'
  if (isYesterday(firstLog)) return 'Yesterday'
  return key
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export default function Logs() {
  const [logs, setLogs] = useState<ProtocolLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.protocols.logs(100).then(setLogs).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="logs-loading">
      <span className="mono t-label">LOADING HISTORY</span>
    </div>
  )

  const groups = groupByDate(logs)
  const totalXp = logs.filter(l => l.status === 'done').reduce((s, l) => s + l.xp_earned, 0)

  return (
    <div className="logs-page">
      <div>
        <div className="section-marker">LOG HISTORY</div>
        <p className="t-body" style={{ marginTop: 4 }}>
          <span className="mono" style={{ color: 'var(--acid)' }}>{logs.length}</span> entries ·{' '}
          <span className="mono" style={{ color: 'var(--ok)' }}>{totalXp} XP</span> earned
        </p>
      </div>

      {logs.length === 0 && (
        <div className="glass card logs-empty">
          <span className="mono t-label" style={{ color: 'var(--acid)' }}>NO LOGS YET</span>
          <p className="t-body" style={{ marginTop: 8 }}>Start logging protocols to build your history.</p>
        </div>
      )}

      <div className="logs-groups">
        {groups.map(([key, groupLogs]) => (
          <div key={key} className="log-group">
            <div className="log-group__header">
              <span className="log-group__date mono t-caption">
                {friendlyDate(key, groupLogs[0].logged_at)}
              </span>
              <div className="log-group__line" />
              <span className="log-group__count t-micro">
                {groupLogs.length} log{groupLogs.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="log-entries">
              {groupLogs.map(log => (
                <div key={log.id} className={`glass log-entry log-entry--${log.status}`}>
                  <div className="log-entry__status-bar" />

                  <div className="log-entry__main">
                    <div className="log-entry__top">
                      <span className="log-entry__name">{log.protocol_name}</span>
                      <span className="log-entry__time mono t-caption">
                        {formatTime(log.logged_at)}
                      </span>
                    </div>

                    <div className="log-entry__bottom">
                      <span className={`status--${log.status} mono t-caption`}>
                        {STATUS_LABEL[log.status]}
                      </span>
                      {log.xp_earned > 0 && (
                        <span className="log-entry__xp mono t-caption">+{log.xp_earned} XP</span>
                      )}
                      {log.note && (
                        <span className="log-entry__note t-caption">{log.note}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
