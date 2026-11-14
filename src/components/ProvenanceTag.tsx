import type { Category } from '../state/types'

/**
 * OBSERVED / DERIVED / ESTIMATED tag shown next to every value. Estimates must carry
 * their assumption, which appears on hover and to screen readers.
 * Lives in components/ (not features/provenance) because every feature uses it.
 */
export function ProvenanceTag({ category, note }: { category: Category; note?: string }) {
  const label = category.toUpperCase()
  return (
    <span className="tag" title={note} aria-label={note ? `${label}: ${note}` : label}>
      {label}
    </span>
  )
}

/** Marks data that is a stand-in until the real dataset is chosen (see placeholders.md). */
export function PlaceholderTag({ note }: { note: string }) {
  return (
    <span className="tag is-placeholder" title={note} aria-label={`Placeholder: ${note}`}>
      PLACEHOLDER
    </span>
  )
}
