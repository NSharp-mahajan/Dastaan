import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, clearSession } from '../utils/auth';

export default function Navbar({ isFixed = true }) {
  const [user, setUser] = useState(getCurrentUser());
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const headerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Sync auth state
  useEffect(() => {
    const handleAuthChange = () => {
      setUser(getCurrentUser());
    };
    window.addEventListener('dastaan-auth-change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('dastaan-auth-change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  // Close mobile menu and dropdown on route change
  useEffect(() => {
    setMenuOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  // Close mobile menu and user dropdown on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuOpen && headerRef.current && !headerRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    await clearSession();
    setUser(null);
    navigate('/');
  };

  const currentPath = location.pathname;
  const isExplore = currentPath === '/';
  const isDiscover = currentPath === '/discover';
  const isInspiration = currentPath === '/inspiration';
  const isJourney = currentPath === '/itinerary' || currentPath === '/my-journey' || currentPath === '/page3';
  const isPlan = currentPath === '/plan' || currentPath === '/page2';
  const isProfile = currentPath === '/profile';

  return (
    <header
      ref={headerRef}
      className={`site-header ${isFixed ? 'fixed-nav' : ''} ${menuOpen ? 'menu-open' : ''}`}
      aria-label="Primary navigation"
    >
      <Link className="site-logo" to="/">
        <img className="logo-icon" src="/images/logo.png" alt="Dastaan Logo" width="44" height="44" />
        <div className="logo-text">
          <span className="logo-title">Dastaan</span>
          <span className="logo-tagline">STORIES &bull; IDEAS &bull; EMOTIONS</span>
        </div>
      </Link>

      <button
        className="mobile-menu-toggle"
        aria-label="Toggle menu"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(!menuOpen);
        }}
      >
        <span className="hamburger"></span>
      </button>

      <nav className="site-nav" aria-label="Main menu">
        <Link to="/" className={isExplore ? 'active' : ''}>
          Explore
        </Link>
        <Link to="/discover" className={isDiscover ? 'active' : ''}>
          Discover
        </Link>
        <Link to="/inspiration" className={isInspiration ? 'active' : ''}>
          Inspiration
        </Link>
        <Link to="/itinerary" className={isJourney ? 'active' : ''}>
          My Journey
        </Link>
        <a href="/#how-it-works">
          How It Works
        </a>
      </nav>

      <div className="header-actions">
        {user ? (
          <div className="user-dropdown-container" ref={dropdownRef}>
            <button
              type="button"
              className="user-profile-btn"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              aria-expanded={userDropdownOpen}
              aria-haspopup="true"
              title="Account Menu"
            >
              <div className="user-avatar" aria-hidden="true">
                {(user.name || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="user-name">{user.name}</span>
              <svg
                className={`dropdown-chevron ${userDropdownOpen ? 'open' : ''}`}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            {userDropdownOpen && (
              <div className="user-dropdown-menu" role="menu">
                <Link
                  to="/profile"
                  className={`dropdown-item ${isProfile ? 'active' : ''}`}
                  onClick={() => setUserDropdownOpen(false)}
                  role="menuitem"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>Profile</span>
                </Link>

                <Link
                  to="/"
                  className={`dropdown-item ${isExplore ? 'active' : ''}`}
                  onClick={() => setUserDropdownOpen(false)}
                  role="menuitem"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                  <span>Home</span>
                </Link>

                <div className="dropdown-divider"></div>

                <button
                  type="button"
                  className="dropdown-item dropdown-logout"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    handleLogout();
                  }}
                  role="menuitem"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/auth" className="nav-link">
            Sign In
          </Link>
        )}
        <Link to="/plan" className={`btn-primary ${isPlan ? 'active' : ''}`}>
          Plan a Trip &rarr;
        </Link>
      </div>
    </header>
  );
}
