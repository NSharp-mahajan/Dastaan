import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DiscoverPage from './pages/DiscoverPage';
import TripConfiguratorPage from './pages/TripConfiguratorPage';
import ItineraryPage from './pages/ItineraryPage';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/AuthPage';
import NotFoundPage from './pages/NotFoundPage';
import TripInspirationPage from './pages/TripInspirationPage';
import DevApiStatus from './components/DevApiStatus';
import { initAuthListener } from './utils/auth';
import { firebaseConfigError } from './firebase';

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

export default function App() {
  const [showConfigNotice, setShowConfigNotice] = useState(true);

  // Restore Firebase Auth session and keep MongoDB profile synchronized
  useEffect(() => {
    if (firebaseConfigError) return undefined;
    const unsubscribe = initAuthListener();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <>
      <ScrollToTop />
      {firebaseConfigError && showConfigNotice && (
        <aside
          style={{
            background: 'linear-gradient(90deg, #173B35 0%, #0d221e 100%)',
            color: '#E8DCC7',
            padding: '8px 16px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(223, 186, 115, 0.4)',
            position: 'sticky',
            top: 0,
            zIndex: 10000,
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: '#DFBA73', fontWeight: 600 }}>Preview Mode:</span>
            <span>Running with local features. Firebase Web credentials are not yet set in <code>.env</code>.</span>
          </div>
          <button
            onClick={() => setShowConfigNotice(false)}
            aria-label="Dismiss notice"
            title="Dismiss notice"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#DFBA73',
              fontSize: '18px',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '0 4px'
            }}
          >
            ×
          </button>
        </aside>
      )}
      <DevApiStatus />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        {/* Discover Route */}
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/discover/discover.html" element={<DiscoverPage />} />

        {/* Trip Inspiration Route */}
        <Route path="/inspiration" element={<TripInspirationPage />} />

        {/* Trip Planning Route */}
        <Route path="/plan" element={<TripConfiguratorPage />} />
        <Route path="/page2" element={<TripConfiguratorPage />} />
        <Route path="/page2/page2.html" element={<TripConfiguratorPage />} />

        {/* Itinerary Route */}
        <Route path="/itinerary" element={<ItineraryPage />} />
        <Route path="/itinerary/:id" element={<ItineraryPage />} />
        <Route path="/my-journey" element={<ItineraryPage />} />
        <Route path="/page3" element={<ItineraryPage />} />
        <Route path="/page3/page3.html" element={<ItineraryPage />} />

        {/* User Profile Route */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/my-profile" element={<ProfilePage />} />

        {/* Authentication Route */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/signup.html" element={<AuthPage />} />

        {/* 404 Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
