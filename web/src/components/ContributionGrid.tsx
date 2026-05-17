import { useMemo, useState } from 'react'
import type { ActivityDay } from '../lib/api'
import './ContributionGrid.css'

interface Props {
  data: ActivityDay[]
}

function getLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  if (count <= 6) return 3
  return 4
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS   = ['S','M','T','W','T','F','S']

export default function ContributionGrid({ data }: Props) {
  const [tooltip, setTooltip] = useState<{ date: string; count: number } | null>(null)

  // Build 52-week grid: each column = 1 week (Sun→Sat)
  const weeks = useMemo(() => {
    // pad start so first day falls on correct weekday
    const first = data[0] ? new Date(data[0].date + 'T00:00:00') : new Date()
    const startDow = first.getDay() // 0=Sun

    const padded: (ActivityDay | null)[] = [
      ...Array(startDow).fill(null),
      ...data,
    ]

    const result: (ActivityDay | null)[][] = []
    for (let i = 0; i < padded.length; i += 7) {
      result.push(padded.slice(i, i + 7))
    }
    return result
  }, [data])

  // Month labels: find week index where month changes
  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = []
    let lastMonth = -1
    weeks.forEach((week, col) => {
      const firstReal = week.find(d => d !== null)
      if (!firstReal) return
      const m = new Date(firstReal.date + 'T00:00:00').getMonth()
      if (m !== lastMonth) {
        labels.push({ label: MONTHS[m], col })
        lastMonth = m
      }
    })
    return labels
  }, [weeks])

  const totalDone = data.reduce((s, d) => s + d.count, 0)
  const activeDays = data.filter(d => d.count > 0).length

  return (
    <div className="cgrid">
      <div className="cgrid__header">
        <span className="section-marker">ACTIVITY GRID</span>
        <span className="cgrid__summary mono t-caption">
          {totalDone} logs · {activeDays} active days
        </span>
      </div>

      <div className="cgrid__scroll">
        {/* Month labels */}
        <div className="cgrid__months" style={{ gridTemplateColumns: `repeat(${weeks.length}, var(--cell))` }}>
          {monthLabels.map(({ label, col }) => (
            <span
              key={`${label}-${col}`}
              className="cgrid__month-label"
              style={{ gridColumn: col + 1 }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="cgrid__body">
          {/* Day-of-week labels */}
          <div className="cgrid__dow">
            {DAYS.map((d, i) => (
              <span key={i} className="cgrid__dow-label">{i % 2 === 1 ? d : ''}</span>
            ))}
          </div>

          {/* Grid cells */}
          <div
            className="cgrid__cells"
            style={{ gridTemplateColumns: `repeat(${weeks.length}, var(--cell))` }}
          >
            {weeks.map((week, wi) =>
              week.map((day, di) => (
                <div
                  key={`${wi}-${di}`}
                  className={`cgrid__cell ${day ? `cgrid__cell--${getLevel(day.count)}` : 'cgrid__cell--empty'}`}
                  onMouseEnter={() => day && setTooltip({ date: day.date, count: day.count })}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="cgrid__tooltip">
          <span className="mono t-caption">{tooltip.date}</span>
          <span className="mono t-caption t-glow-acid"> · {tooltip.count} log{tooltip.count !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Legend */}
      <div className="cgrid__legend">
        <span className="t-caption" style={{ color: 'var(--text-4)' }}>Less</span>
        {([0, 1, 2, 3, 4] as const).map(l => (
          <div key={l} className={`cgrid__cell cgrid__cell--${l}`} />
        ))}
        <span className="t-caption" style={{ color: 'var(--text-4)' }}>More</span>
      </div>
    </div>
  )
}
