import type { CSSProperties } from 'react'
import { Icon, type IconName } from './Icon'

export type Tool = { id: string; label: string; icon: IconName; on?: boolean; onClick: () => void }

type Props = {
  open: boolean
  onToggle: () => void
  /** With no tools only the tour and hide-interface buttons show */
  tools: Tool[]
  uiHidden: boolean
  onHideUi: () => void
  onGuide: () => void
  /** Accessible name of the tool row */
  label?: string
}

/**
 * Bottom left (from MapaMars): the round tools button, which slides a row of tool buttons out to its right,
 * with two small buttons stacked above it: the tour (see Tour.tsx), and one that clears every panel off the
 * screen for an unobstructed view. While the interface is hidden only that last button stays, to bring it back.
 */
export function ToolDock({ open, onToggle, tools, uiHidden, onHideUi, onGuide, label = 'Tools' }: Props) {
  return (
    <div className={`tool-dock${open ? ' is-open' : ''}`}>
      <div className="tool-dock-side">
        <button type="button" className="tool-dock-mini tool-dock-guide" onClick={onGuide} aria-label="Take the tour" title="Take the tour" inert={uiHidden}>
          <Icon name="help" />
        </button>
        <button
          type="button"
          className="tool-dock-mini tool-dock-hide"
          onClick={onHideUi}
          aria-pressed={uiHidden}
          aria-label={uiHidden ? 'Show the interface' : 'Hide the interface'}
          title={uiHidden ? 'Show the interface (H)' : 'Hide the interface (H)'}
        >
          <Icon name={uiHidden ? 'showUi' : 'hideUi'} />
        </button>
      </div>
      {tools.length > 0 && (
        <div className="tool-dock-row" inert={uiHidden}>
          <button type="button" className="tool-dock-toggle" onClick={onToggle} aria-expanded={open} aria-controls="tool-tray" aria-label={open ? 'Close tools' : 'Open tools'} title={open ? 'Close tools' : 'Tools'}>
            <Icon name={open ? 'close' : 'tools'} />
          </button>
          <div id="tool-tray" className="tool-tray" role="toolbar" aria-label={label} inert={!open}>
            {tools.map((t, i) => (
              <button
                key={t.id}
                type="button"
                className={`tool${t.on ? ' is-on' : ''}`}
                style={{ '--i': i } as CSSProperties}
                aria-pressed={t.on === undefined ? undefined : t.on}
                onClick={t.onClick}
              >
                <Icon name={t.icon} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
