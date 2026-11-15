import type { ReactNode } from 'react'

/*
 * Line icons drawn in the current text colour: the MapaMars menu and globe sets merged with MAPA's modes.
 */
const ICONS: Record<string, ReactNode> = {
  // Menu and pages
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  home: <><path d="M4 11l8-7 8 7" /><path d="M6 9.5V20h12V9.5" /></>,
  globe: <><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c-3 3-3 13 0 16M12 4c3 3 3 13 0 16" /></>,
  missions: <><path d="M6 21V4" /><path d="M6 4h11l-2.5 4L17 12H6" /></>,
  explore: <><circle cx="12" cy="12" r="8" /><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" /></>,
  plan: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M7.5 16.5c3-1 2-6 5-7.5s3-1 4-1.5" strokeDasharray="2 2.5" /></>,
  eva: <><circle cx="12" cy="6" r="2.5" /><path d="M12 9v6M8 21l4-6 4 6M7 12h10" /></>,
  about: <><circle cx="12" cy="12" r="8" /><path d="M12 11v5M12 8h.01" /></>,
  account: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.2-3.8 4-5.5 7-5.5s5.8 1.7 7 5.5" /></>,
  sound: <><path d="M4 10v4h4l5 4V6L8 10H4z" /><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11" /></>,
  mute: <><path d="M4 10v4h4l5 4V6L8 10H4z" /><path d="M17 10l4 4M21 10l-4 4" /></>,
  // Tools
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" /><circle cx="12" cy="17" r="0.6" fill="currentColor" /></>,
  // Four corners pulling out: clear the screen for a full view of the scene, and corners pulling in to bring it back
  hideUi: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  showUi: <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />,
  target: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
  layers: <><path d="M12 4l9 5-9 5-9-5 9-5z" /><path d="M3 14l9 5 9-5" /></>,
  save: <><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v5h7V4M8 20v-6h8v6" /></>,
  // Globe
  labels: <><circle cx="7" cy="12" r="2.5" /><path d="M12 10h8M12 14h5" /></>,
  orbits: <><ellipse cx="12" cy="12" rx="9" ry="4" /><circle cx="12" cy="12" r="2.5" /></>,
  grid: <><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c-3 3-3 13 0 16M12 4c3 3 3 13 0 16" /></>,
  reset: <><path d="M4 12a8 8 0 1 0 2.5-5.8" /><path d="M4 4v4h4" /></>,
  back: <path d="M14 6l-6 6 6 6" />,
  rotate: <><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v4h-4" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  live: <><circle cx="12" cy="12" r="3" fill="currentColor" /><circle cx="12" cy="12" r="8" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.7 3.6M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" /></>,
  chevron: <path d="M6 9l6 6 6-6" />,
  play: <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />,
  pause: <><path d="M8.5 5.5v13" /><path d="M15.5 5.5v13" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></>,
  list: <path d="M5 7h14M5 12h14M5 17h9" />,
  // A small satellite: body and two solar panels
  orbiter: <><rect x="9.5" y="9.5" width="5" height="5" rx="1" /><path d="M3 8l5 5M16 11l5 5M7.5 12.5L3 8M8 13l-1.5 1.5M17.5 9.5L16 11" /><path d="M12 14.5V18M10 19.5h4" /></>,
  // A dashed route between two stops
  route: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M7.5 16.5l2-2M11.5 12.5l1-1M14.5 9.5l2-2" /></>,
}

export type IconName = keyof typeof ICONS

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  )
}
