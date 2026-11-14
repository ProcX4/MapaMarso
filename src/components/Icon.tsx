import type { ReactNode } from 'react'

/* Line icons drawn in the current text colour (the MapaMars menu set, plus MAPA's modes and tools). */
const ICONS: Record<string, ReactNode> = {
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  explore: <><circle cx="12" cy="12" r="8" /><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" /></>,
  plan: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M7.5 16.5c3-1 2-6 5-7.5s3-1 4-1.5" strokeDasharray="2 2.5" /></>,
  eva: <><circle cx="12" cy="6" r="2.5" /><path d="M12 9v6M8 21l4-6 4 6M7 12h10" /></>,
  about: <><circle cx="12" cy="12" r="8" /><path d="M12 11v5M12 8h.01" /></>,
  account: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.2-3.8 4-5.5 7-5.5s5.8 1.7 7 5.5" /></>,
  sound: <><path d="M4 10v4h4l5 4V6L8 10H4z" /><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11" /></>,
  mute: <><path d="M4 10v4h4l5 4V6L8 10H4z" /><path d="M17 10l4 4M21 10l-4 4" /></>,
  tools: <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>,
  guide: <><circle cx="12" cy="12" r="8" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01" /></>,
  hide: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /><path d="M3 3l18 18" /></>,
  target: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
  route: <><circle cx="6" cy="6" r="2" /><circle cx="18" cy="18" r="2" /><path d="M8 6h6a3 3 0 0 1 0 6h-4a3 3 0 0 0 0 6h6" /></>,
  layers: <><path d="M12 4l9 5-9 5-9-5 9-5z" /><path d="M3 14l9 5 9-5" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></>,
  save: <><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v5h7V4M8 20v-6h8v6" /></>,
}

export function Icon({ name, size = 20 }: { name: keyof typeof ICONS | string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  )
}
