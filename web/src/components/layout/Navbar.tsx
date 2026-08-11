import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBars,
  faChevronDown,
  faEllipsisV,
  faMoon,
  faSignOutAlt,
  faSun,
  faUser,
  faUserCog,
  faWater,
} from '@fortawesome/free-solid-svg-icons'
import { navLinks } from '../../data/dams'
import { useAuth } from '../../hooks/AuthContext'
import { useTheme } from '../../hooks/ThemeContext'
import { publicUrl } from '../../utils/publicUrl'
import { AlarmBell } from './AlarmBell'

interface NavbarProps {
  onMenuToggle: () => void
  onOpenDams: () => void
  menuButtonRef?: RefObject<HTMLButtonElement | null>
}

export function Navbar({ onMenuToggle, onOpenDams, menuButtonRef }: NavbarProps) {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'User'
  const [userOpen, setUserOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const userRef = useRef<HTMLDivElement>(null)
  const mobileNavRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (userRef.current && !userRef.current.contains(target)) {
        setUserOpen(false)
      }
      if (mobileNavRef.current && !mobileNavRef.current.contains(target)) {
        setMobileNavOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return (
    <nav className="navbar">
      <div className="nav-left">
        <button
          ref={menuButtonRef}
          type="button"
          className="menu-toggle"
          onClick={onMenuToggle}
          aria-label="Open cascade sidebar"
        >
          <FontAwesomeIcon icon={faBars} />
        </button>
        <Link to="/" className="logo">
          <img src={publicUrl('logo.png')} alt="Hydro-M Logo" />
        </Link>
      </div>

      {/* Desktop: horizontal nav links */}
      <ul className="nav-menu">
        {navLinks.map((link) => (
          <li key={link.to} className="nav-item">
            <NavLink
              to={link.to}
              end={link.to === '/'}
              title={'fullLabel' in link ? link.fullLabel : link.label}
              aria-label={'fullLabel' in link ? link.fullLabel : link.label}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="nav-right">
        <AlarmBell />

        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} />
          <span className="theme-label">{theme === 'light' ? 'Dark' : 'Light'}</span>
        </button>

        {/* Mobile: page links dropdown (top right) */}
        <div className="mobile-links-dropdown" ref={mobileNavRef}>
          <button
            type="button"
            className="mobile-links-btn"
            aria-label="Open navigation menu"
            aria-expanded={mobileNavOpen}
            onClick={() => {
              setUserOpen(false)
              setMobileNavOpen((open) => !open)
            }}
          >
            <FontAwesomeIcon icon={faEllipsisV} />
            <span className="mobile-links-label">Menu</span>
            <FontAwesomeIcon icon={faChevronDown} className="chevron" />
          </button>
          {mobileNavOpen && (
            <div className="dropdown-menu mobile-links-menu show">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  title={'fullLabel' in link ? link.fullLabel : link.label}
                  aria-label={'fullLabel' in link ? link.fullLabel : link.label}
                  className={({ isActive }) => `dropdown-item${isActive ? ' active' : ''}`}
                  onClick={() => setMobileNavOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setMobileNavOpen(false)
                  onOpenDams()
                }}
              >
                <FontAwesomeIcon icon={faWater} />
                Dams
              </button>
            </div>
          )}
        </div>

        <div className="user-dropdown" ref={userRef}>
          <button
            type="button"
            className="user-btn"
            onClick={() => {
              setMobileNavOpen(false)
              setUserOpen((open) => !open)
            }}
          >
            <FontAwesomeIcon icon={faUser} />
            <span className="user-name">{firstName}</span>
            <FontAwesomeIcon icon={faChevronDown} />
          </button>
          {userOpen && (
            <div className="dropdown-menu show">
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setUserOpen(false)
                  navigate('/profile')
                }}
              >
                <FontAwesomeIcon icon={faUserCog} />
                Profile
              </button>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  logout()
                  setUserOpen(false)
                  navigate('/login', { replace: true })
                }}
              >
                <FontAwesomeIcon icon={faSignOutAlt} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
