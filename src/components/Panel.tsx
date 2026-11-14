import type { ReactNode } from 'react'

/** Floating 14px-radius panel with an optional uppercase kicker heading. */
export function Panel({ title, actions, className = '', children, label }: { title?: string; actions?: ReactNode; className?: string; children: ReactNode; label?: string }) {
  return (
    <section className={`panel ${className}`} aria-label={label ?? title}>
      {(title || actions) && (
        <div className="panel-head">
          {title && <h2 className="kicker">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}
