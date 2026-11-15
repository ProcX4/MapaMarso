import { Icon, type IconName } from './Icon'

export type Tool = { id: string; label: string; icon: IconName; on?: boolean; onClick: () => void }

type Props = {
  /** With no tools only the tour and hide-interface buttons show */
  tools: Tool[]
  uiHidden: boolean
  onHideUi: () => void
  onGuide: () => void
  /** Accessible name of the tool row */
  label?: string
}

/**
 * Bottom left: a row of tool buttons, always showing, with two small buttons stacked above it: the tour
 * (see Tour.tsx), and one that clears every panel off the screen for an unobstructed view. While the interface is hidden only that last button stays, to bring it back.
 */
export function ToolDock({ tools, uiHidden, onHideUi, onGuide, label = 'Tools' }: Props) {
  return (
    <div className="tool-dock">
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
          <div className="tool-tray" role="toolbar" aria-label={label}>
            {tools.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`tool${t.on ? ' is-on' : ''}`}
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
