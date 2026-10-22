import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DiscoverPage from './pages/DiscoverPage';
import TripConfiguratorPage from './pages/TripConfiguratorPage';
import ItineraryPage from './pages/ItineraryPage';
import AuthPage from './pages/AuthPage';
import NotFoundPage from './pages/NotFoundPage';
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
  // Restore Firebase Auth session and keep MongoDB profile synchronized
  useEffect(() => {
    if (firebaseConfigError) return undefined;
    const unsubscribe = initAuthListener();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (firebaseConfigError) {
    return (
      <main style={{ maxWidth: 720, margin: '10vh auto', padding: '2rem', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6 }}>
        <h1>Firebase setup is incomplete</h1>
        <p>{firebaseConfigError}</p>
        <p>In Firebase Console, open project <strong>dastaan-32c4e</strong>, then go to Project settings → General → Your apps. Select the Web app (or create one) and copy its Firebase SDK configuration.</p>
        <p>Set these values in the project root <code>.env</code> file, then restart Vite:</p>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{'VITE_FIREBASE_API_KEY=<apiKey from the Web app config>\nVITE_FIREBASE_AUTH_DOMAIN=<authDomain>\nVITE_FIREBASE_PROJECT_ID=<projectId>\nVITE_FIREBASE_APP_ID=<appId>'}</pre>
        <p>Use the Firebase Web app configuration. Do not use backend service account or Firebase Admin credentials.</p>
      </main>
    );
  }

  return (
    <>
      <ScrollToTop />
      <DevApiStatus />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        
        {/* Discover Route */}
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/discover/discover.html" element={<DiscoverPage />} />

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
