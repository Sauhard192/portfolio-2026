import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'

import type { HomeView } from '../../types/home'
import { ScrambleText } from '../ui/ScrambleText'

interface SiteHeaderProps {
  view?: HomeView
  onViewChange?: (view: HomeView) => void
}

export function SiteHeader({ view, onViewChange }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLElement>(null)
  const showViewSwitcher = view !== undefined && onViewChange !== undefined

  useEffect(() => {
    if (!menuOpen) return

    const previousOverflow = document.body.style.overflow
    const menu = menuRef.current
    const focusableLinks = menu?.querySelectorAll<HTMLElement>('a[href]') ?? []
    document.body.style.overflow = 'hidden'
    focusableLinks[0]?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        return
      }

      if (event.key !== 'Tab' || focusableLinks.length === 0) return

      const first = focusableLinks[0]
      const last = focusableLinks[focusableLinks.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      menuButtonRef.current?.focus()
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="home-header" data-menu-open={menuOpen} data-page-header>
      <NavLink className="home-logo" to="/" data-cursor="interactive" aria-label="Jhelli home">
        JHELLI
      </NavLink>

      {showViewSwitcher && (
        <div className="view-switcher" aria-label="Project display" role="group">
          <span className="view-switcher__active" data-view={view} aria-hidden="true" />
          <button
            className={view === 'grid' ? 'is-active' : ''}
            type="button"
            aria-pressed={view === 'grid'}
            data-cursor="interactive"
            onClick={() => onViewChange('grid')}
          >
            GRID
          </button>
          <button
            className={view === 'list' ? 'is-active' : ''}
            type="button"
            aria-pressed={view === 'list'}
            data-cursor="interactive"
            onClick={() => onViewChange('list')}
          >
            LIST
          </button>
        </div>
      )}

      <button
        ref={menuButtonRef}
        className="menu-toggle"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="primary-navigation"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        data-cursor="interactive"
        onClick={() => setMenuOpen((isOpen) => !isOpen)}
      >
        <span />
        <span />
      </button>

      <nav
        ref={menuRef}
        id="primary-navigation"
        className="home-nav"
        aria-label="Primary navigation"
        data-open={menuOpen}
      >
        <NavLink to="/" end data-cursor="interactive" onClick={closeMenu}>
          <ScrambleText>HOME</ScrambleText>
        </NavLink>
        <NavLink to="/art" data-cursor="interactive" onClick={closeMenu}>
          <ScrambleText>ART</ScrambleText>
        </NavLink>
        <NavLink to="/photography" data-cursor="interactive" onClick={closeMenu}>
          <ScrambleText>PHOTOGRAPHY</ScrambleText>
        </NavLink>
        <NavLink to="/contact" data-cursor="interactive" onClick={closeMenu}>
          <ScrambleText>CONTACT</ScrambleText>
        </NavLink>
      </nav>
    </header>
  )
}
