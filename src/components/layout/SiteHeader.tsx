import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import menuIcon from '../../assets/icons/menu.svg'
import closeIcon from '../../assets/icons/close.svg'

import type { HomeView, MediaGalleryView } from '../../types/home'
import { ScrambleText } from '../ui/ScrambleText'

interface SiteHeaderProps {
  view?: HomeView | MediaGalleryView
  onViewChange?: (view: HomeView | MediaGalleryView) => void
  viewOptions?: readonly [
    { value: HomeView | MediaGalleryView; label: string },
    { value: HomeView | MediaGalleryView; label: string },
  ]
}

const HOME_VIEW_OPTIONS = [
  { value: 'grid', label: 'GRID' },
  { value: 'list', label: 'LIST' },
] as const

export function SiteHeader({
  view,
  onViewChange,
  viewOptions = HOME_VIEW_OPTIONS,
}: SiteHeaderProps) {
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLElement>(null)
  const showViewSwitcher = view !== undefined && onViewChange !== undefined
  const activePosition = view === viewOptions[1].value ? 'second' : 'first'

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
  const handleNavClick = (path: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === path) {
      event.preventDefault()
      return
    }

    closeMenu()
  }

  return (
    <header className="home-header" data-menu-open={menuOpen}>
      <NavLink
        className="home-logo"
        to="/"
        data-cursor="interactive"
        data-page-header
        aria-label="Jhelli home"
        onClick={handleNavClick('/')}
      >
        JHELLI
      </NavLink>

      {showViewSwitcher && (
        <div className="view-switcher" aria-label="Project display" role="group">
          <div className="view-switcher__content" data-page-header>
            <span
              className="view-switcher__active"
              data-position={activePosition}
              aria-hidden="true"
            />
            {viewOptions.map((option) => (
              <button
                className={view === option.value ? 'is-active' : ''}
                type="button"
                aria-pressed={view === option.value}
                data-cursor="interactive"
                onClick={() => onViewChange(option.value)}
                key={option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
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
        data-page-header
        onClick={() => setMenuOpen((isOpen) => !isOpen)}
      >
        <img src={menuOpen ? closeIcon : menuIcon} width={20} height={20} alt="" aria-hidden="true" />
      </button>

      <nav
        ref={menuRef}
        id="primary-navigation"
        className="home-nav"
        aria-label="Primary navigation"
        data-open={menuOpen}
      >
        <NavLink
          to="/"
          end
          data-cursor="interactive"
          data-page-header
          onClick={handleNavClick('/')}
        >
          <ScrambleText>HOME</ScrambleText>
        </NavLink>
        <NavLink
          to="/art"
          data-cursor="interactive"
          data-page-header
          onClick={handleNavClick('/art')}
        >
          <ScrambleText>ART</ScrambleText>
        </NavLink>
        <NavLink
          to="/photography"
          data-cursor="interactive"
          data-page-header
          onClick={handleNavClick('/photography')}
        >
          <ScrambleText>PHOTOGRAPHY</ScrambleText>
        </NavLink>
        <NavLink
          to="/contact"
          data-cursor="interactive"
          data-page-header
          onClick={handleNavClick('/contact')}
        >
          <ScrambleText>CONTACT</ScrambleText>
        </NavLink>
      </nav>
    </header>
  )
}
