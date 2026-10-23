import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link className="site-logo" to="/">
            <img className="logo-icon" src="/images/logo.png" alt="Dastaan Logo" width="44" height="44" />
            <div className="logo-text">
              <span className="logo-title" style={{ color: 'var(--nav-paper, var(--paper))' }}>Dastaan</span>
              <span className="logo-tagline" style={{ color: 'rgba(232, 220, 199, 0.65)' }}>STORIES &bull; IDEAS &bull; EMOTIONS</span>
            </div>
          </Link>
          <p className="footer-desc">
            Dastaan brings travel logs, maps, stays, and budgets into a single cinematic planning experience tailored to your journey.
          </p>
        </div>

        <div className="footer-links-group">
          <div className="footer-col">
            <h4>Explore</h4>
            <ul>
              <li><Link to="/">Explore</Link></li>
              <li><Link to="/discover">Discover</Link></li>
              <li><Link to="/inspiration">Inspiration</Link></li>
              <li><Link to="/itinerary">My Journey</Link></li>
              <li><Link to="/plan">Plan a Trip</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li><a href="#about">About Us</a></li>
              <li><a href="#journal">Travel Journal</a></li>
              <li><a href="#careers">Careers</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <ul>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#terms">Terms of Service</a></li>
              <li><a href="#cookies">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>&copy; 2026 Dastaan. All rights reserved.</p>
        <div className="footer-socials">
          <a href="#twitter" aria-label="Twitter">Twitter</a>
          <a href="#instagram" aria-label="Instagram">Instagram</a>
          <a href="#github" aria-label="GitHub">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
