import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, clearSession } from '../utils/auth';

export default function Navbar({ isFixed = true }) {
  const [user, setUser] = useState(getCurrentUser());
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const headerRef = useRef(null);

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

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuOpen && headerRef.current && !headerRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [menuOpen]);

  const handleLogout = async () => {
    await clearSession();
    setUser(null);
    navigate('/');
  };

  const currentPath = location.pathname;
  const isExplore = currentPath === '/';
  const isDiscover = currentPath === '/discover';
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
        <Link to="/itinerary" className={isJourney ? 'active' : ''}>
          My Journey
        </Link>
        <a href="/#how-it-works">
          How It Works
        </a>
      </nav>

      <div className="header-actions">
        {user ? (
          <>
            <Link
              to="/profile"
              className={`user-profile-nav ${isProfile ? 'active' : ''}`}
              title="View your profile & saved journeys"
              aria-label="View user profile"
            >
              <div className="user-avatar" aria-hidden="true">
                {(user.name || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="user-name">{user.name}</span>
            </Link>
            <Link className="nav-link home-link" to="/">
              Home
            </Link>
            <button type="button" className="nav-link logout-button" onClick={handleLogout}>
              Log out
            </button>
          </>
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
