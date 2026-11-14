import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useHover, useRoute } from '../../hooks/useDerived'
import { formatDistance, formatM, formatSlope, NO_DATA } from '../../lib/format'
import { ProvenanceTag } from '../../components/ProvenanceTag'

const H = 150
const PAD = { top: 12, right: 16, bottom: 24, left: 64 }

/**
 * Hand-drawn SVG profile. Hover links both ways: hovering here moves a marker on the
 * map, and hovering the route on the map moves the cursor here.
 */
export function ElevationProfile() {
  const route = useRoute()
  const { hover, setHover } = useHover()
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(600)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(240, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { profile, totalM } = route
  const elevs = profile.map((p) => p.elevM).filter((e): e is number => e !== null)
  const hasElev = elevs.length > 1
  const min = hasElev ? Math.min(...elevs) : 0
  const max = hasElev ? Math.max(...elevs) : 1
  const span = max - min || 1
  const innerW = width - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const x = (d: number) => PAD.left + (totalM ? (d / totalM) * innerW : 0)
  const y = (e: number) => PAD.top + innerH - ((e - min) / span) * innerH

  /** SVG path through consecutive points that have elevation; gaps break the line. */
  const pathFor = (pts: typeof profile) => {
    let d = ''
    let pen = false
    for (const p of pts) {
      if (p.elevM === null) {
        pen = false
        continue
      }
      d += `${pen ? 'L' : 'M'}${x(p.distM).toFixed(1)},${y(p.elevM).toFixed(1)}`
      pen = true
    }
    return d
  }

  // Stop positions along the route
  const stopMarks = route.order.map((s, i) => ({
    stop: s,
    d: route.legs.slice(0, i).reduce((sum, l) => sum + l.m, 0),
    label: s.kind === 'base' ? 'H' : s.kind === 'destination' ? 'B' : String(i),
  }))

  const hoverIndex = hover ? profile.findIndex((p) => p.at === hover) : -1
  const hp = hoverIndex >= 0 ? profile[hoverIndex] : null

  const pickAt = (clientX: number) => {
    const rect = box.current!.getBoundingClientRect()
    const d = ((clientX - rect.left - PAD.left) / innerW) * totalM
    let best = profile[0]
    for (const p of profile) if (Math.abs(p.distM - d) < Math.abs(best.distM - d)) best = p
    setHover(best?.at ?? null)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const stepPts = Math.max(1, Math.round(profile.length / 50))
    const i = hoverIndex < 0 ? 0 : hoverIndex + (e.key === 'ArrowRight' ? stepPts : -stepPts)
    setHover(profile[Math.min(profile.length - 1, Math.max(0, i))].at)
  }

  if (route.order.length < 2) {
    return (
      <div className="plan-profile is-empty">
        <h2 className="kicker">Elevation profile</h2>
        <p className="muted">Add a second stop to see the profile.</p>
      </div>
    )
  }

  const gridYs = hasElev ? [min, min + span / 2, max] : []

  return (
    <div className="plan-profile">
      <div className="plan-profile-head">
        <h2 className="kicker">Elevation profile</h2>
        <ProvenanceTag category="derived" note="Sampled every 10 m along straight legs from the site DTM" />
        {hp && (
          <span className="plan-profile-readout num">
            {formatDistance(hp.distM)} · {hp.elevM !== null ? formatM(hp.elevM) : NO_DATA} · {hp.slopeDeg !== null ? formatSlope(hp.slopeDeg) : NO_DATA}
          </span>
        )}
      </div>
      <div
        ref={box}
        className="plan-profile-chart"
        tabIndex={0}
        role="img"
        aria-label={`Elevation profile over ${formatDistance(totalM)}. Use left and right arrows to move along the route.`}
        onPointerMove={(e: PointerEvent) => pickAt(e.clientX)}
        onPointerLeave={() => setHover(null)}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
      >
        <svg width={width} height={H}>
          {gridYs.map((g) => (
            <g key={g}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(g)} y2={y(g)} className="profile-grid" />
              <text x={PAD.left - 8} y={y(g) + 4} textAnchor="end" className="profile-axis">{formatM(g)}</text>
            </g>
          ))}
          <line x1={PAD.left} x2={width - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} className="profile-grid" />
          <text x={PAD.left} y={H - 6} className="profile-axis">0</text>
          <text x={width - PAD.right} y={H - 6} textAnchor="end" className="profile-axis">{formatDistance(totalM)}</text>

          {hasElev ? (
            <>
              <path d={pathFor(profile)} className="profile-line" />
              {route.hazards.map((h) => (
                <path key={h.fromM} d={pathFor(profile.filter((p) => p.distM >= h.fromM && p.distM <= h.toM))} className="profile-line" style={{ stroke: `var(--${h.token})`, strokeWidth: 3 }} />
              ))}
            </>
          ) : (
            <text x={PAD.left + innerW / 2} y={PAD.top + innerH / 2} textAnchor="middle" className="profile-empty">
              No elevation data along this route
            </text>
          )}

          {stopMarks.map((m, i) => {
            const pt = profile.find((p) => p.distM >= m.d - 0.5)
            const cy = hasElev && pt?.elevM != null ? y(pt.elevM) : PAD.top + innerH
            const science = m.stop.kind === 'science'
            return (
              <g key={`${m.stop.id}-${i}`}>
                <circle cx={x(m.d)} cy={cy} r={science ? 5 : 4} className={science ? 'profile-science' : 'profile-stop'} />
                <text x={x(m.d)} y={cy - 9} textAnchor="middle" className="profile-axis">{m.label}</text>
              </g>
            )
          })}

          {hp && <line x1={x(hp.distM)} x2={x(hp.distM)} y1={PAD.top} y2={PAD.top + innerH} className="profile-cursor" />}
        </svg>
      </div>
    </div>
  )
}
