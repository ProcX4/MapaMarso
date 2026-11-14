import type { CSSProperties } from 'react'
import { Icon } from './Icon'

export type Tool = { id: string; label: string; icon: string; onClick: () => void; on?: boolean }

type Props = {
  open: boolean
  onToggle: () => void
  tools: Tool[]
  uiHidden: boolean
  onHideUi: () => void
  onGuide: () => void
}

/**
 * Tools (from MapaMars): a round button at the bottom left that slides a row of tool buttons out to its
 * right, with the guide and hide-the-interface buttons stacked above it.
 */
export function ToolDock({ open, onToggle, tools, uiHidden, onHideUi, onGuide }: Props) {
  return (
    <div className={`tool-dock${open ? ' is-open' : ''}`}>
      <div className="tool-dock-side">
        <button type="button" className="tool-dock-mini tool-dock-guide" onClick={onGuide} aria-label="Guided tour" title="Guided tour">
          <Icon name="guide" size={18} />
        </button>
        <button
          type="button"
          className="tool-dock-mini tool-dock-hide"
          onClick={onHideUi}
          aria-pressed={uiHidden}
          aria-label={uiHidden ? 'Show the interface' : 'Hide the interface'}
          title={uiHidden ? 'Show the interface (H)' : 'Clear view (H)'}
        >
          <Icon name="hide" size={18} />
        </button>
      </div>
      <div className="tool-dock-row">
        <button type="button" className="tool-dock-toggle" onClick={onToggle} aria-expanded={open} aria-label={open ? 'Close tools' : 'Open tools'} title="Tools">
          <Icon name={open ? 'close' : 'tools'} />
        </button>
        <div className="tool-tray" inert={!open}>
          {tools.map((t, i) => (
            <button
              key={t.id}
              type="button"
              className={`tool${t.on ? ' is-on' : ''}`}
              style={{ '--i': i } as CSSProperties}
              aria-pressed={t.on === undefined ? undefined : t.on}
              onClick={t.onClick}
            >
              <Icon name={t.icon} size={16} />
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
