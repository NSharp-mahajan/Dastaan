import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LightboxModal from '../components/LightboxModal';
import { INSPIRATION_DESTINATIONS, formatTripPayload } from '../data/inspirationData';
import CategoryFilterBar from '../components/inspiration/CategoryFilterBar';
import EditorialStoryCard from '../components/inspiration/EditorialStoryCard';
import JourneyReelModal from '../components/inspiration/JourneyReelModal';
import GravityMap from '../components/inspiration/GravityMap';
import ThresholdTransition from '../components/inspiration/ThresholdTransition';
import apiClient from '../services/api';
import '../styles/navigation.css';
import '../styles/inspiration.css';

// Featured destination spotlight for the hero CTA (easy to configure, independent of filters)
const FEATURED_SPOTLIGHT_ID = 'jaipur';

export default function TripInspirationPage() {
  const navigate = useNavigate();

  // Category and Search Filter State (Single source of truth)
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // A destination becomes selected only after an explicit map interaction.
  const [selectedDestination, setSelectedDestination] = useState(null);

  const handleSelectDestination = useCallback((dest) => {
    setSelectedDestination(dest);
  }, []);

  // Threshold Cinematic Doorway State (Stage 6)
  const [thresholdState, setThresholdState] = useState({
    isOpen: false,
    destination: null,
    originRect: null
  });

  const handleOpenThreshold = useCallback((dest, originRect = null) => {
    if (!dest) return;
    setThresholdState({
      isOpen: true,
      destination: dest,
      originRect
    });
  }, []);

  const handleThresholdComplete = useCallback(() => {
    const dest = thresholdState.destination;
    setThresholdState({ isOpen: false, destination: null, originRect: null });
    setActiveJourneyDest(dest);
  }, [thresholdState.destination]);

  // Signature Journey Reel State
  const [activeJourneyDest, setActiveJourneyDest] = useState(null);

  // Lightbox Modal State (Stacking layered over JourneyReelModal when triggered)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxData, setLightboxData] = useState(null);

  // Authenticated Saved Destinations State
  const [savedDestinations, setSavedDestinations] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: '' });

  // Toast notification helper
  const showToast = (message) => {
    setToast({ visible: true, message });
    setTimeout(() => {
      setToast({ visible: false, message: '' });
    }, 3200);
  };

  // Sync saved destinations from backend API
  const loadSavedDestinations = useCallback(async () => {
    try {
      const res = await apiClient.getSavedDestinations();
      if (res.success && Array.isArray(res.data?.data)) {
        setSavedDestinations(res.data.data.map(d => d.destinationId).filter(Boolean));
      }
    } catch {
      // Offline or unauthenticated fallback
    }
  }, []);

  useEffect(() => {
    loadSavedDestinations();
    window.addEventListener('dastaan-auth-change', loadSavedDestinations);
    return () => {
      window.removeEventListener('dastaan-auth-change', loadSavedDestinations);
    };
  }, [loadSavedDestinations]);

  // Reset all filters
  const handleResetFilters = () => {
    setActiveCategory('all');
    setSearchQuery('');
  };

  // Open Lightbox place viewer
  const handleOpenLightbox = (data) => {
    setLightboxData(data);
    setIsLightboxOpen(true);
  };

  // Toggle Save Destination (integrated with Dastaan's saved destinations API)
  const handleToggleSave = async (dest) => {
    const isCurrentlySaved = savedDestinations.includes(dest.id);
    const updated = isCurrentlySaved
      ? savedDestinations.filter(id => id !== dest.id)
      : [...savedDestinations, dest.id];

    // Optimistic UI update
    setSavedDestinations(updated);

    try {
      if (isCurrentlySaved) {
        const res = await apiClient.removeSavedDestination(dest.id);
        if (res.success) {
          showToast(`Removed ${dest.name} from your saved destinations.`);
        } else if (res.status === 401) {
          setSavedDestinations(savedDestinations);
          showToast('Sign in to manage saved destinations.');
        }
      } else {
        const res = await apiClient.saveDestination({
          destinationId: dest.id,
          destinationName: dest.name,
          country: dest.country
        });
        if (res.success) {
          showToast(`Saved ${dest.name} to your travel archive.`);
        } else if (res.status === 401) {
          setSavedDestinations(savedDestinations);
          showToast('Sign in to save journeys to your account.');
        }
      }
    } catch {
      // Revert on unexpected network failure
      setSavedDestinations(savedDestinations);
      showToast('Network issue updating saved destination.');
    }
  };

  /**
   * Plan This Trip Action
   * Seamlessly formats payload to Dastaan's canonical localStorage contract and navigates to /plan
   */
  const handlePlanThisTrip = (dest) => {
    if (!dest) return;
    const tripPayload = formatTripPayload(dest);
    if (!tripPayload) return;

    // 1. Store in localStorage for instant hydration in TripConfiguratorPage
    localStorage.setItem('dastaanTrip', JSON.stringify(tripPayload));

    // 2. Navigate to /plan passing navigation state
    navigate('/plan', {
      state: {
        fromInspiration: true,
        destinationId: dest.id
      }
    });
  };

  // Filter destination dataset based on active category & search query
  const filteredDestinations = useMemo(() => {
    return INSPIRATION_DESTINATIONS.filter((dest) => {
      // Category match
      const matchesCategory =
        activeCategory === 'all' || dest.categories.includes(activeCategory);

      // Search match
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        dest.name.toLowerCase().includes(query) ||
        dest.region.toLowerCase().includes(query) ||
        dest.country.toLowerCase().includes(query) ||
        dest.tagline.toLowerCase().includes(query) ||
        dest.categoryLabels.some(l => l.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  useEffect(() => {
    if (selectedDestination && !filteredDestinations.some((dest) => dest.id === selectedDestination.id)) {
      setSelectedDestination(null);
    }
  }, [filteredDestinations, selectedDestination]);

  return (
    <div className="inspiration-page">
      <Navbar isFixed={true} />

      <main className="insp-main">
        {/* INSPIRATION HERO SECTION */}
        <section className="insp-hero-section" aria-label="Trip Inspiration Introduction">
          <div className="insp-container text-center">
            <span className="insp-eyebrow">✦ DASTAAN EDITORIAL COLLECTIONS ✦</span>
            <h1 className="insp-hero-heading">Some places are seen. Others are experienced.</h1>
            <p className="insp-hero-desc">
              Each journey is crafted around cultural rhythm, iconic sights, and intimate local flavors.
              Step inside a signature editorial reel or browse our curated destination archives.
            </p>

            <div className="insp-hero-cta-group">
              <button
                type="button"
                className="btn-hero-journey-reel"
                onClick={() => {
                  const featured =
                    INSPIRATION_DESTINATIONS.find((d) => d.id === FEATURED_SPOTLIGHT_ID) ||
                    INSPIRATION_DESTINATIONS[0];
                  handleSelectDestination(featured);
                  handleOpenThreshold(featured, null);
                }}
              >
                <span>STEP INSIDE A JOURNEY &rarr;</span>
              </button>


              <button
                type="button"
                className="btn-hero-explore-collections"
                onClick={() => {
                  document.getElementById('destination-collections')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                BROWSE ARCHIVE &darr;
              </button>
            </div>
          </div>
        </section>

        {/* ANCHOR WRAPPER FOR CURATED COLLECTIONS & UNIFIED CATEGORY NAVIGATION */}
        <div id="inspiration-collections">
          {/* THE SINGLE UNIFIED CATEGORY NAVIGATION & SEARCH BAR */}
          <CategoryFilterBar
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            totalResultsCount={filteredDestinations.length}
            onResetFilters={handleResetFilters}
          />
        </div>

        <GravityMap
          destinations={filteredDestinations}
          selectedDestination={selectedDestination}
          onSelectDestination={handleSelectDestination}
          onOpenJourneyReel={(dest) => {
            handleSelectDestination(dest);
            handleOpenThreshold(dest);
          }}
        />

        {/* CURATED DESTINATION COLLECTIONS ARCHIVE */}
        <section id="destination-collections" className="insp-main-content">
          <div className="insp-container">

            {/* EMPTY STATE */}
            {filteredDestinations.length === 0 ? (
              <div className="insp-empty-state" role="status">
                <svg
                  className="insp-empty-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
                <h3>NO JOURNEYS MATCHED YOUR SEARCH</h3>
                <p>
                  We couldn't find any curated collections matching "{searchQuery}".
                  Try widening your search terms or exploring all collections.
                </p>
                <button
                  type="button"
                  className="btn-insp-primary"
                  onClick={handleResetFilters}
                >
                  SHOW ALL COLLECTIONS &rarr;
                </button>
              </div>
            ) : (
              <div className="insp-editorial-grid">
                {filteredDestinations.map((dest) => (
                  <EditorialStoryCard
                    key={dest.id}
                    destination={dest}
                    onPlan={handlePlanThisTrip}
                    isSaved={savedDestinations.includes(dest.id)}
                    onToggleSave={handleToggleSave}
                    onOpenLightbox={handleOpenLightbox}
                    onOpenJourneyReel={(d, originRect = null) => {
                      handleSelectDestination(d);
                      handleOpenThreshold(d, originRect);
                    }}
                  />
                ))}
              </div>
            )}

          </div>
        </section>
      </main>

      {/* CINEMATIC THRESHOLD TRANSITION DOORWAY (STAGE 6) */}
      <ThresholdTransition
        isOpen={thresholdState.isOpen}
        destination={thresholdState.destination}
        originRect={thresholdState.originRect}
        onComplete={handleThresholdComplete}
        onClose={() => setThresholdState({ isOpen: false, destination: null, originRect: null })}
      />

      {/* SIGNATURE JOURNEY REEL MODAL (4 Chapters) */}
      <JourneyReelModal
        isOpen={!!activeJourneyDest}
        destination={activeJourneyDest}
        onClose={() => setActiveJourneyDest(null)}
        onPlan={handlePlanThisTrip}
        isSaved={activeJourneyDest ? savedDestinations.includes(activeJourneyDest.id) : false}
        onToggleSave={handleToggleSave}
        onOpenLightbox={handleOpenLightbox}
        onSelectDestination={setActiveJourneyDest}
        isLightboxActive={isLightboxOpen}
      />

      {/* LIGHTBOX PLACE VIEWER (Layered over Journey Reel when active) */}
      <LightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        data={lightboxData}
      />

      {/* FLOATING TOAST NOTIFICATION */}
      {toast.visible && (
        <div className="insp-toast" role="status" aria-live="polite">
          <div className="insp-toast-icon">✓</div>
          <div className="insp-toast-msg">{toast.message}</div>
        </div>
      )}

      <Footer />
    </div>
  );
}
