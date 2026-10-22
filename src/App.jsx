import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DiscoverPage from './pages/DiscoverPage';
import TripConfiguratorPage from './pages/TripConfiguratorPage';
import ItineraryPage from './pages/ItineraryPage';
import AuthPage from './pages/AuthPage';
import NotFoundPage from './pages/NotFoundPage';
import DevApiStatus from './components/DevApiStatus';

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
