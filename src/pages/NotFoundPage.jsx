import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/navigation.css';

export default function NotFoundPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0B3A35', color: '#E8DCC7' }}>
      <Navbar isFixed={true} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 60px', textAlign: 'center' }}>
        <span style={{ color: '#DFBA73', letterSpacing: '2px', fontSize: '14px', textTransform: 'uppercase', marginBottom: '16px', display: 'block' }}>
          404 &middot; Page Not Found
        </span>
        <h1 style={{ fontFamily: "'Ogg Medium', Georgia, serif", fontSize: 'clamp(2.5rem, 5vw, 4rem)', color: '#DFBA73', marginBottom: '20px' }}>
          LOST IN THE JOURNEY
        </h1>
        <p style={{ maxWidth: '480px', lineHeight: 1.6, marginBottom: '32px', color: 'rgba(232, 220, 199, 0.8)' }}>
          The path you seek does not exist in our stories. Let's return to familiar horizons and continue crafting your journey.
        </p>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: '#DFBA73',
            color: '#071D1A',
            padding: '12px 28px',
            borderRadius: '4px',
            fontWeight: 600,
            textDecoration: 'none',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}
        >
          Return to Explore &rarr;
        </Link>
      </div>
      <Footer />
    </div>
  );
}
