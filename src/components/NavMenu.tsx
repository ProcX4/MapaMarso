import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import { useAuth } from '../hooks/useAuth'
import { isSpaceSoundOn, onSpaceSoundChange, setSpaceSound } from '../lib/spaceSound'
import { setDebugZoom, useDebugZoom } from '../lib/debugZoom'

export type NavPage = { hash: string; label: string; icon: string; hint: string }

/** Whether the ambient space sound is on, kept in step with the switch wherever it's flipped. */
function useSpaceSoundOn() {
  const [on, setOn] = useState(isSpaceSoundOn)
  useEffect(() => onSpaceSoundChange(setOn), [])
  return on
}

/**
 * The menu (from MapaMars): a ☰ button at the top right that slides a sidebar in from the right with the
 * pages, the space-sound switch and signing in. It closes with ×, a click outside it, Esc, or picking a page.
 */
export function NavMenu({ pages, current }: { pages: NavPage[]; current: string }) {
  const { available, user, loading } = useAuth()
  const soundOn = useSpaceSoundOn()
  const debugZoom = useDebugZoom()
  // The page the menu was opened on: arriving on any other page (a link, Back) leaves it closed
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === current
  const setOpen = (on: boolean) => setOpenOn(on ? current : null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenOn(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const accountCurrent = current === '#/account'
  return (
    <>
      <button type="button" className="nav-menu-btn" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="nav-drawer" aria-label="Open menu" title="Menu">
        <Icon name="menu" />
      </button>
      {/* Rendered at the top of the page: the menu bar's blur would otherwise hold the sidebar inside the bar */}
      {createPortal(
        <>
          <div className={`nav-drawer-backdrop${open ? ' is-open' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />
          <aside id="nav-drawer" className={`nav-drawer${open ? ' is-open' : ''}`} aria-label="Menu" inert={!open}>
            <div className="nav-drawer-head">
              <span className="nav-brand">MAPA MARS</span>
              <button type="button" className="nav-drawer-close" onClick={() => setOpen(false)} aria-label="Close menu">
                <Icon name="close" />
              </button>
            </div>
            <nav className="nav-drawer-links" aria-label="Main">
              {pages.map((p) => (
                <a key={p.hash} href={p.hash} className={p.hash === current ? 'is-current' : ''} aria-current={p.hash === current ? 'page' : undefined} onClick={() => setOpen(false)}>
                  <Icon name={p.icon} />
                  <span>
                    {p.label}
                    <small>{p.hint}</small>
                  </span>
                </a>
              ))}
            </nav>
            <button type="button" className={`nav-drawer-sound${soundOn ? ' is-on' : ''}`} role="switch" aria-checked={soundOn} onClick={() => setSpaceSound(!soundOn)}>
              <Icon name={soundOn ? 'sound' : 'mute'} />
              <span>
                Space sound
                <small>{soundOn ? 'On · a quiet ambience' : 'Off'}</small>
              </span>
              <span className="nav-switch" aria-hidden="true" />
            </button>
            <button type="button" className={`nav-drawer-sound${debugZoom ? ' is-on' : ''}`} role="switch" aria-checked={debugZoom} onClick={() => setDebugZoom(!debugZoom)}>
              <Icon name="target" />
              <span>
                Debug: zoom points
                <small>{debugZoom ? 'On · the 2D map shows its zoom and where the photos start' : 'Off'}</small>
              </span>
              <span className="nav-switch" aria-hidden="true" />
            </button>
            {available && !loading && (
              <a href="#/account" className={`nav-drawer-account${accountCurrent ? ' is-current' : ''}`} aria-current={accountCurrent ? 'page' : undefined} onClick={() => setOpen(false)}>
                <Icon name="account" />
                <span>
                  {user ? user.username : 'Sign in'}
                  <small>{user ? 'Your account' : 'Save and share your missions'}</small>
                </span>
              </a>
            )}
          </aside>
        </>,
        document.body,
      )}
    </>
  )
}
