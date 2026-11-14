import { Icon } from './Icon'

/** A small search field for the side panels, with a button to clear it (from MapaMars). */
export function SearchBox({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <div className="hud-search">
      <Icon name="search" />
      <input type="search" value={value} maxLength={60} onChange={(e) => onChange(e.target.value)} placeholder={label} aria-label={label} />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search">
          <Icon name="close" />
        </button>
      )}
    </div>
  )
}
