import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LightboxModal from '../components/LightboxModal';
import { mockItineraries, resolveImage, interestImages, interestExplanations } from '../data/itineraries';
import apiClient from '../services/api';
import { getCurrentUser } from '../utils/auth';
import { auth } from '../firebase';
import '../styles/navigation.css';
import '../styles/page3.css';

export default function ItineraryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: paramId } = useParams();
  const tripId = paramId || searchParams.get('id') || searchParams.get('tripId');

  const [trip, setTrip] = useState(null);
  const [activeDay, setActiveDay] = useState(1);
  const [isSaved, setIsSaved] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastInfo, setToastInfo] = useState({ type: 'success', title: 'JOURNEY SAVED', message: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Phase 3: Interactive Itinerary Editing & Persistence States
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [replaceModal, setReplaceModal] = useState({ isOpen: false, dayNum: 1, actIdx: -1, currentTitle: '' });
  const [moveDayModal, setMoveDayModal] = useState({ isOpen: false, dayNum: 1, actIdx: -1, currentTitle: '' });
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // V2 Live Data State
  const [weather, setWeather] = useState(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [places, setPlaces] = useState([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);

  // Tooltip state for budget bar
  const [budgetTooltip, setBudgetTooltip] = useState({ text: '', x: 0, visible: false });

  // Lightbox state
  const [lightboxData, setLightboxData] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const budgetBarRef = useRef(null);

  // Warn user before leaving with unsaved modifications
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);


  useEffect(() => {
    let isMounted = true;

    async function loadTrip() {
      setIsLoading(true);
      setErrorMessage('');
      setIsEmpty(false);

      // Scenario 1: Specific trip requested via URL parameter ?id=...
      if (tripId) {
        try {
          const res = await apiClient.getTripById(tripId);
          if (!isMounted) return;

          if (res.success && res.data?.data) {
            const fetched = res.data.data;
            setTrip(fetched);
            setIsSaved(true);
            setHasUnsavedChanges(false);
            localStorage.setItem('dastaanTrip', JSON.stringify(fetched));
            setIsLoading(false);
            return;
          } else {
            console.warn('[ItineraryPage] Could not fetch trip by ID:', res.error);
            setErrorMessage(res.error || 'Failed to retrieve the requested journey. You may not have permission to view it or it may not exist.');
            setIsEmpty(true);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.warn('[ItineraryPage] Network error fetching trip by ID:', e);
          if (!isMounted) return;
          setErrorMessage('Unable to connect to the server to load the requested journey.');
          setIsEmpty(true);
          setIsLoading(false);
          return;
        }
      }

      // Scenario 2: Load from localStorage if present
      const saved = localStorage.getItem('dastaanTrip');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.destination) {
            if (!isMounted) return;
            setTrip(parsed);
            setIsSaved(Boolean(parsed._id));
            setHasUnsavedChanges(false);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error('[ItineraryPage] Error parsing saved local trip:', e);
        }
      }

      // Scenario 3: Attempt to fetch user's saved trips from backend
      try {
        const userTripsRes = await apiClient.getUserTrips();
        if (!isMounted) return;

        if (userTripsRes.success && Array.isArray(userTripsRes.data?.data) && userTripsRes.data.data.length > 0) {
          const latestTrip = userTripsRes.data.data[0];
          setTrip(latestTrip);
          localStorage.setItem('dastaanTrip', JSON.stringify(latestTrip));
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.warn('[ItineraryPage] Error querying user trips:', e);
      }

      // Scenario 4: No trip found
      if (isMounted) {
        setIsEmpty(true);
        setIsLoading(false);
      }
    }

    loadTrip();

    return () => {
      isMounted = false;
    };
  }, [tripId]);

  // V2: Fetch live weather forecast and destination places
  useEffect(() => {
    if (!trip || !trip.destination) return;
    let isMounted = true;

    async function fetchLiveData() {
      const destName = trip.destination.name;
      const lat = trip.destination.latitude;
      const lng = trip.destination.longitude;

      setIsLoadingWeather(true);
      try {
        const weatherRes = await apiClient.getWeather({
          latitude: lat,
          longitude: lng,
          destination: destName
        });
        if (isMounted && weatherRes.success && weatherRes.data) {
          setWeather(weatherRes.data);
        }
      } catch (e) {
        console.warn('[ItineraryPage] Live weather fetch failed:', e);
      } finally {
        if (isMounted) setIsLoadingWeather(false);
      }

      setIsLoadingPlaces(true);
      try {
        const placesRes = await apiClient.getDestinationPlaces(destName, 'all', lat, lng);
        if (isMounted && placesRes.success && Array.isArray(placesRes.data)) {
          setPlaces(placesRes.data);
        }
      } catch (e) {
        console.warn('[ItineraryPage] Live places fetch failed:', e);
      } finally {
        if (isMounted) setIsLoadingPlaces(false);
      }
    }

    fetchLiveData();
    return () => { isMounted = false; };
  }, [trip]);

  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [trip, activeDay]);

  // Loading Screen
  if (isLoading) {
    return (
      <div className="itinerary-body">
        <Navbar isFixed={false} />
        <div style={{
          minHeight: '75vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#071D1A',
          color: '#F4EFE3',
          textAlign: 'center',
          padding: '80px 20px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            border: '3px solid rgba(214, 181, 109, 0.25)',
            borderTopColor: '#D6B56D',
            borderRadius: '50%',
            animation: 'spin 0.9s linear infinite',
            marginBottom: '24px'
          }}></div>
          <h2 style={{
            fontFamily: 'Cinzel, Georgia, serif',
            color: '#D6B56D',
            fontSize: '22px',
            letterSpacing: '2px',
            textTransform: 'uppercase'
          }}>
            Retrieving Your Journey
          </h2>
          <p style={{ color: '#E8DCC7', opacity: 0.8, marginTop: '8px', fontSize: '14px' }}>
            Connecting to Dastaan and preparing your curated itinerary...
          </p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
        <Footer />
      </div>
    );
  }

  // Empty State Screen
  if (isEmpty || !trip) {
    return (
      <div className="itinerary-body">
        <Navbar isFixed={false} />
        <div style={{
          minHeight: '75vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#071D1A',
          color: '#F4EFE3',
          textAlign: 'center',
          padding: '80px 24px'
        }}>
          <span style={{
            color: '#D6B56D',
            letterSpacing: '3px',
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            marginBottom: '12px',
            display: 'block'
          }}>
            CHAPTER 02 &middot; NO ACTIVE ITINERARY
          </span>
          <h1 style={{
            fontFamily: 'Cinzel, Georgia, serif',
            color: '#F4EFE3',
            fontSize: '32px',
            maxWidth: '650px',
            margin: '0 0 16px',
            lineHeight: '1.3'
          }}>
            WHERE WILL YOUR STORY TAKE YOU?
          </h1>
          <p style={{
            color: '#E8DCC7',
            opacity: 0.85,
            lineHeight: '1.7',
            maxWidth: '520px',
            marginBottom: '36px',
            fontSize: '15px'
          }}>
            {errorMessage || 'You have not built a personalized itinerary yet. Select your destination, budget, and travel preferences to begin your journey.'}
          </p>
          <button
            type="button"
            onClick={() => navigate('/plan')}
            style={{
              background: '#D6B56D',
              color: '#071D1A',
              border: 'none',
              padding: '14px 34px',
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              borderRadius: '2px',
              transition: 'transform 0.2s ease, background 0.2s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#e5c98a'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#D6B56D'; }}
          >
            PLAN A TRIP &rarr;
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const destId = (trip.destination?.id || '').toLowerCase();
  const data = mockItineraries[destId] || mockItineraries['default'];
  const destName = (trip.destination?.name || data.name).toUpperCase();
  const countryName = (trip.destination?.country || data.country || 'India').toUpperCase();
  const duration = Math.max(1, trip.duration || 3);
  const budget = trip.budget || 8000;
  const travelStyle = trip.travelStyle || 'Balanced';
  const interests = Array.isArray(trip.interests) ? trip.interests : [];

  const heroImgSrc = resolveImage(destId, resolveImage(destName, trip.destination?.image || data.image));

  // Dynamic tagline (prefer persisted tagline if available)
  let tagline = trip.itinerary?.tagline;
  if (!tagline) {
    tagline = `A ${travelStyle.toLowerCase()} journey`;
    if (interests.length > 0) {
      tagline += ` through ${trip.destination?.name || destName}'s ${interests.join(', ').toLowerCase()}`;
    } else {
      tagline += ` through ${trip.destination?.name || destName}'s cultural landmarks and local escapes`;
    }
    tagline += '.';
  }

  // Days list calculation: prefer database-stored or generated days, fallback to curated data
  const daysList = (Array.isArray(trip.itinerary?.days) && trip.itinerary.days.length > 0)
    ? trip.itinerary.days
    : (Array.isArray(data?.days) && data.days.length > 0 ? data.days : null);

  if (!daysList || daysList.length === 0) {
    return (
      <div className="itinerary-body">
        <Navbar isFixed={false} />
        <div style={{
          minHeight: '75vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#071D1A',
          color: '#F4EFE3',
          textAlign: 'center',
          padding: '80px 24px'
        }}>
          <span style={{ color: '#D6B56D', letterSpacing: '3px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>
            NO ACTIVE ITINERARY FOUND
          </span>
          <h1 style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#F4EFE3', fontSize: '30px', maxWidth: '600px', margin: '0 0 16px' }}>
            BUILD YOUR PERSONALIZED STORY
          </h1>
          <p style={{ color: '#E8DCC7', opacity: 0.85, maxWidth: '520px', marginBottom: '32px', fontSize: '15px', lineHeight: '1.6' }}>
            No generated itinerary exists for this session. Please select your destination, travel pace, and interests on the planner to generate an authentic route.
          </p>
          <button
            type="button"
            onClick={() => navigate('/plan')}
            style={{
              background: '#D6B56D',
              color: '#071D1A',
              border: 'none',
              padding: '14px 34px',
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              borderRadius: '2px'
            }}
          >
            PLAN A TRIP &rarr;
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const currentDayData = daysList[activeDay - 1] || daysList[0] || {};

  // Open Lightbox
  const openLightbox = (title, desc, cat, imgSrc, imgLabel) => {
    setLightboxData({
      title,
      desc,
      cat: cat || 'EXPLORE',
      destBadge: destName,
      imgSrc,
      imgLabel: imgLabel || title.toUpperCase()
    });
    setIsLightboxOpen(true);
  };

  // Route statistics & real-world road network integration (Phase 2)
  const currentRoute = currentDayData?.route || null;
  const dayActivities = currentDayData?.activities || [];
  const placesCount = dayActivities.length;

  const hasValidRoute = Boolean(
    currentRoute &&
    currentRoute.provider !== 'none' &&
    currentRoute.provider !== 'insufficient-coordinates' &&
    typeof currentRoute.distanceKm === 'number' &&
    currentRoute.distanceKm > 0
  );

  const routeProvider = currentRoute?.provider || "none";
  const isRouteEstimated = currentRoute?.isEstimated ?? (!hasValidRoute ? false : true);
  const movementKm = hasValidRoute ? currentRoute.distanceKm : null;
  const travelDurationMin = hasValidRoute ? currentRoute.durationMin : null;

  // Compute SVG projection from genuine coordinates if available (no fake decorative curve)
  let points = [];
  let pathD = "";
  let hasRealGeometry = false;

  if (hasValidRoute && currentRoute?.geometry?.coordinates && currentRoute.geometry.coordinates.length >= 2) {
    const rawCoords = currentRoute.geometry.coordinates; // [[lng, lat], ...]
    const lngs = rawCoords.map(c => c[0]);
    const lats = rawCoords.map(c => c[1]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    const spanLng = (maxLng - minLng) || 0.01;
    const spanLat = (maxLat - minLat) || 0.01;
    const padLng = spanLng * 0.15;
    const padLat = spanLat * 0.15;

    const bMinLng = minLng - padLng;
    const bMaxLng = maxLng + padLng;
    const bMinLat = minLat - padLat;
    const bMaxLat = maxLat + padLat;

    const project = (lng, lat) => ({
      x: Math.round(70 + ((lng - bMinLng) / (bMaxLng - bMinLng)) * 660),
      y: Math.round(150 - ((lat - bMinLat) / (bMaxLat - bMinLat)) * 110)
    });

    pathD = rawCoords.map((c, i) => `${i === 0 ? "M" : "L"} ${project(c[0], c[1]).x} ${project(c[0], c[1]).y}`).join(" ");

    points = dayActivities.map((act) => {
      if (typeof act.latitude === "number" && typeof act.longitude === "number") {
        const pt = project(act.longitude, act.latitude);
        return { x: pt.x, y: pt.y, name: act.title };
      }
      return null;
    }).filter(Boolean);

    if (points.length >= 2) {
      hasRealGeometry = true;
    }
  }

  // Budget calculations with transparent estimates
  const breakdown = (trip.itinerary?.breakdown && trip.itinerary.breakdown.length > 0)
    ? trip.itinerary.breakdown
    : [
        { name: "Accommodation (Est.)", pct: 40, color: "#D6B56D", isEstimated: true },
        { name: "Food & Dining (Est.)", pct: 25, color: "#C87955", isEstimated: true },
        { name: "Local Transport (Est.)", pct: 15, color: "#7F9087", isEstimated: true },
        { name: "Activities & Fees (Est.)", pct: 15, color: "#F4EFE3", isEstimated: true },
        { name: "Buffer & Contingency", pct: 5, color: "rgba(214, 181, 109, 0.35)", isEstimated: true }
      ];

  // Available replacement places from catalog: exclude all places already in ANY day
  const existingPlaceTitles = new Set(
    (trip?.itinerary?.days || []).flatMap(d => (d.activities || []).map(a => (a.title || '').toLowerCase().trim()))
  );
  const availableReplacementPlaces = places.filter(
    p => p && p.name && !existingPlaceTitles.has((p.name || '').toLowerCase().trim())
  );

  // Trigger server-side recalculation of routes and feasibility after an edit
  const triggerRecalculation = async (updatedDays) => {
    setIsRecalculating(true);
    const updatedItinerary = {
      ...trip.itinerary,
      days: updatedDays
    };

    try {
      const res = await apiClient.recalculateItinerary({
        destination: trip.destination,
        travelStyle: trip.travelStyle || 'Balanced',
        itinerary: updatedItinerary
      });

      if (res && res.success && res.data) {
        const canonicalItin = res.data;
        const newTrip = {
          ...trip,
          itinerary: canonicalItin
        };
        setTrip(newTrip);
        localStorage.setItem('dastaanTrip', JSON.stringify(newTrip));
        setHasUnsavedChanges(true);
        setIsSaved(false);
      } else {
        throw new Error(res?.error || 'Recalculation returned an unsuccessful response.');
      }
    } catch (err) {
      console.warn('[ItineraryPage] Recalculation failed:', err);
      // Fallback: keep local order changes in trip
      const fallbackTrip = {
        ...trip,
        itinerary: updatedItinerary
      };
      setTrip(fallbackTrip);
      localStorage.setItem('dastaanTrip', JSON.stringify(fallbackTrip));
      setHasUnsavedChanges(true);
      setIsSaved(false);
      setToastInfo({
        type: 'error',
        title: 'RECALCULATION NOTE',
        message: 'Itinerary was updated locally, but road routes could not be refreshed. Changes are preserved.'
      });
      setShowToast(true);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Move activity up or down within current day
  const handleMoveActivity = (dayNum, actIdx, direction) => {
    if (!trip?.itinerary?.days) return;
    const days = trip.itinerary.days.map(d => ({
      ...d,
      activities: d.activities ? [...d.activities] : []
    }));

    const dayObj = days.find(d => d.dayNum === dayNum);
    if (!dayObj || !dayObj.activities) return;

    const targetIdx = actIdx + direction;
    if (targetIdx < 0 || targetIdx >= dayObj.activities.length) return;

    const temp = dayObj.activities[actIdx];
    dayObj.activities[actIdx] = dayObj.activities[targetIdx];
    dayObj.activities[targetIdx] = temp;

    triggerRecalculation(days);
  };

  // Remove activity from current day
  const handleRemoveActivity = (dayNum, actIdx) => {
    if (!trip?.itinerary?.days) return;
    const days = trip.itinerary.days.map(d => ({
      ...d,
      activities: d.activities ? [...d.activities] : []
    }));

    const dayObj = days.find(d => d.dayNum === dayNum);
    if (!dayObj || !dayObj.activities) return;

    dayObj.activities.splice(actIdx, 1);
    triggerRecalculation(days);
  };

  // Move activity to another day
  const handleMoveToAnotherDay = (sourceDayNum, actIdx, targetDayNum) => {
    if (!trip?.itinerary?.days) return;
    const days = trip.itinerary.days.map(d => ({
      ...d,
      activities: d.activities ? [...d.activities] : []
    }));

    const sourceDay = days.find(d => d.dayNum === sourceDayNum);
    const targetDay = days.find(d => d.dayNum === targetDayNum);

    if (!sourceDay || !targetDay || !sourceDay.activities) return;

    const [movedAct] = sourceDay.activities.splice(actIdx, 1);
    if (!targetDay.activities) targetDay.activities = [];
    targetDay.activities.push(movedAct);

    setMoveDayModal({ isOpen: false, dayNum: 1, actIdx: -1, currentTitle: '' });
    triggerRecalculation(days);
  };

  // Open replace modal
  const openReplaceModal = (dayNum, actIdx, currentTitle) => {
    setReplaceModal({
      isOpen: true,
      dayNum,
      actIdx,
      currentTitle: currentTitle || ''
    });
  };

  const closeReplaceModal = () => {
    setReplaceModal({ isOpen: false, dayNum: 1, actIdx: -1, currentTitle: '' });
  };

  // Open move day modal
  const openMoveDayModal = (dayNum, actIdx, currentTitle) => {
    setMoveDayModal({
      isOpen: true,
      dayNum,
      actIdx,
      currentTitle: currentTitle || ''
    });
  };

  const closeMoveDayModal = () => {
    setMoveDayModal({ isOpen: false, dayNum: 1, actIdx: -1, currentTitle: '' });
  };

  // Handle selected place from replace modal
  const handleSelectReplacement = (selectedPlace) => {
    if (!trip?.itinerary?.days || !selectedPlace) return;
    const days = trip.itinerary.days.map(d => ({
      ...d,
      activities: d.activities ? [...d.activities] : []
    }));

    const dayObj = days.find(d => d.dayNum === replaceModal.dayNum);
    if (!dayObj) return;

    const cat = (selectedPlace.category || 'attraction').toUpperCase();
    const isRestaurant = cat === 'RESTAURANT';
    const visitDur = selectedPlace.visitDurationHours || (isRestaurant ? 1.5 : 2.0);

    const newActivity = {
      title: selectedPlace.name,
      desc: selectedPlace.address ? `Located at ${selectedPlace.address}. Realistic visit: ~${visitDur}h.` : `Curated sight in ${destName}.`,
      cat: isRestaurant ? 'FOOD' : 'CULTURE',
      image: selectedPlace.photoUrl || heroImgSrc,
      imageLabel: `${selectedPlace.name.toUpperCase()} · ${isRestaurant ? 'FOOD' : 'CULTURE'}`,
      placeId: selectedPlace.placeId,
      latitude: selectedPlace.latitude,
      longitude: selectedPlace.longitude,
      address: selectedPlace.address,
      rating: selectedPlace.rating,
      visitDurationHours: visitDur,
      openingHours: selectedPlace.openingHours || null,
      openingStatus: selectedPlace.openingHours && selectedPlace.openingHours.length > 0 ? 'verified_hours' : 'unknown',
      source: selectedPlace.source || 'curated-catalog',
      attribution: selectedPlace.attribution || 'Dastaan Verified Heritage Archive'
    };

    if (replaceModal.actIdx >= 0 && dayObj.activities && dayObj.activities[replaceModal.actIdx]) {
      // Replace existing activity
      dayObj.activities[replaceModal.actIdx] = newActivity;
    } else {
      // Add as new activity to this day
      if (!dayObj.activities) dayObj.activities = [];
      dayObj.activities.push(newActivity);
    }

    closeReplaceModal();
    triggerRecalculation(days);
  };

  const handleBudgetHover = (item, e) => {
    if (!budgetBarRef.current) return;
    const rect = budgetBarRef.current.getBoundingClientRect();
    const segmentVal = Math.round(budget * (item.pct / 100));
    setBudgetTooltip({
      text: `${item.name} · ${item.pct}% · ₹${segmentVal.toLocaleString('en-IN')}`,
      x: e.clientX - rect.left,
      visible: true
    });
  };

  const handleSaveJourney = async () => {
    // 1. Verify that the user is authenticated
    const currentUser = auth.currentUser || getCurrentUser();
    if (!currentUser) {
      setAuthModalOpen(true);
      setToastInfo({
        type: 'error',
        title: 'AUTHENTICATION REQUIRED',
        message: 'Please sign in to permanently save your journey to your Dastaan account.'
      });
      setShowToast(true);
      return;
    }

    // 2. Prevent accidental duplicate saves
    if (isSaving) return;
    setIsSaving(true);
    setShowToast(false);

    try {
      let persisted = null;
      if (trip._id) {
        // Persist updates to existing journey
        const res = await apiClient.updateTrip(trip._id, trip);
        if (!res.success) {
          throw new Error(res.error || 'Failed to update your saved journey in the database.');
        }
        persisted = res.data?.data || trip;
      } else {
        // Persist new journey to MongoDB Atlas
        const res = await apiClient.createTrip(trip);
        if (!res.success || !res.data?.data) {
          throw new Error(res.error || 'Failed to persist journey to your account.');
        }
        persisted = res.data.data;
      }

      setTrip(persisted);
      localStorage.setItem('dastaanTrip', JSON.stringify(persisted));
      localStorage.setItem('dastaanSavedJourney', JSON.stringify(persisted));
      setIsSaved(true);
      setHasUnsavedChanges(false);
      setToastInfo({
        type: 'success',
        title: 'JOURNEY SAVED',
        message: `Your ${destName} itinerary is saved to your account.`
      });
      setShowToast(true);
      setTimeout(() => {
        document.getElementById('save-toast')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } catch (err) {
      console.error('[ItineraryPage] Save journey failed:', err);
      setToastInfo({
        type: 'error',
        title: 'SAVE FAILED',
        message: err.message || 'Unable to save your itinerary. Please check your connection and try again.'
      });
      setShowToast(true);
      setTimeout(() => {
        document.getElementById('save-toast')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditPreferences = () => {
    navigate('/plan');
  };

  const handleStartOver = () => {
    localStorage.removeItem('dastaanTrip');
    localStorage.removeItem('dastaanSavedJourney');
    navigate('/plan');
  };

  return (
    <div className="itinerary-body">
      <Navbar isFixed={true} />

      <main>
        {/* SECTION 1: CINEMATIC HERO (80vh) */}
        <section className="hero-section" id="hero-section">
          <div className="hero-image-container image-placeholder" id="hero-image-wrap">
            {heroImgSrc && (
              <img
                id="hero-bg-img"
                src={heroImgSrc}
                alt={destName}
                className="hero-img-element loaded"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <div className="placeholder-overlay">
              <span className="placeholder-badge" id="hero-placeholder-badge">
                [ {destName} DESTINATION IMAGE ]
              </span>
            </div>
            <div className="hero-gradient-overlay"></div>
          </div>

          <div className="hero-content-layer">
            <span className="hero-eyebrow reveal-on-scroll">YOUR PERSONALIZED JOURNEY</span>
            <h1 className="hero-title reveal-on-scroll" id="hero-dest-name">
              {destName}
            </h1>
            <div className="hero-meta reveal-on-scroll" id="hero-meta">
              {countryName} &bull; {duration} DAYS &bull; ₹{budget.toLocaleString('en-IN')}
            </div>
            <p className="hero-tagline reveal-on-scroll" id="hero-desc">
              "{tagline}"
            </p>

            <button
              type="button"
              className="btn-scroll-down reveal-on-scroll"
              id="btn-scroll-down"
              aria-label="Scroll to trip details"
              onClick={() => {
                document.getElementById('glance-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span>EXPLORE YOUR JOURNEY</span>
              <span className="scroll-arrow">&darr;</span>
            </button>
          </div>
        </section>

        {/* SECTION 2: TRIP AT A GLANCE (Warm Ivory Editorial) */}
        <section className="section-glance reveal-on-scroll" id="glance-section">
          <div className="container">
            <div className="section-header-editorial">
              <span className="section-eyebrow">THE DETAILS</span>
              <h2 className="section-title-serif">YOUR TRIP AT A GLANCE</h2>
            </div>

            <div className="glance-editorial-grid">
              <div className="glance-col">
                <span className="glance-num" id="glance-duration">
                  {String(duration).padStart(2, '0')}
                </span>
                <span className="glance-label">DAYS</span>
              </div>
              <div className="glance-divider"></div>
              <div className="glance-col">
                <span className="glance-num" id="glance-budget">
                  ₹{budget.toLocaleString('en-IN')}
                </span>
                <span className="glance-label">BUDGET</span>
              </div>
              <div className="glance-divider"></div>
              <div className="glance-col">
                <span className="glance-num" id="glance-interests-count">
                  {String(interests.length).padStart(2, '0')}
                </span>
                <span className="glance-label">INTERESTS</span>
              </div>
              <div className="glance-divider"></div>
              <div className="glance-col">
                <span className="glance-num" id="glance-style">
                  {travelStyle.toUpperCase()}
                </span>
                <span className="glance-label">STYLE</span>
              </div>
            </div>

            <div className="glance-interests-bar" id="glance-interests-list">
              {interests.length > 0
                ? interests.map(i => i.toUpperCase()).join(' \u2022 ')
                : 'BALANCED \u2022 CURATED \u2022 PERSONALIZED'}
            </div>
          
            {/* LIVE WEATHER OUTLOOK (Open-Meteo Integration) */}
            <div className="weather-capsule-card">
              <div className="weather-header-row">
                <div className="weather-title-group">
                  <span className="section-eyebrow" style={{ margin: 0 }}>LIVE DESTINATION CLIMATE</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-deep)' }}>
                    {destName} Forecast
                  </span>
                </div>
                {weather?.current && (
                  <div className="weather-current-badge">
                    <span>{weather.current.icon}</span>
                    <span>{weather.current.temperature}°C</span>
                    <span>&bull;</span>
                    <span>{weather.current.condition}</span>
                  </div>
                )}
              </div>

              {isLoadingWeather ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#7F9087', fontSize: '0.88rem' }}>
                  Connecting to live meteorological satellites...
                </div>
              ) : weather?.daily && weather.daily.length > 0 ? (
                <div className="weather-days-grid">
                  {weather.daily.slice(0, 5).map((d, idx) => (
                    <div key={idx} className="weather-day-item">
                      <span className="weather-day-date">
                        {new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <span className="weather-day-icon" aria-hidden="true">{d.icon}</span>
                      <span className="weather-day-temp">
                        {Math.round(d.tempMax)}° / {Math.round(d.tempMin)}°C
                      </span>
                      <span className="weather-day-condition">{d.condition}</span>
                      <span className="weather-day-precip">
                        {d.precipitationProbability}% Rain
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px', color: '#7F9087', fontSize: '0.85rem' }}>
                  Weather forecast synchronizes automatically for destinations with verified coordinates.
                </div>
              )}

              <div style={{ marginTop: '14px', fontSize: '0.72rem', color: '#7F9087', textAlign: 'right' }}>
                Source: Real-time atmospheric models via Open-Meteo &bull; Coords:{' '}
                {trip.destination?.latitude ? `${trip.destination.latitude.toFixed(2)}°, ${trip.destination.longitude?.toFixed(2)}°` : 'Regional centroid'}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: ITINERARY INTRO & TRAVEL JOURNAL (Dark Forest Green) */}
        <section className="section-itinerary reveal-on-scroll" id="itinerary-section">
          <div className="container">
            {/* Intro Banner */}
            <div className="itinerary-intro">
              <span className="section-eyebrow gold-eyebrow">DAY BY DAY</span>
              <h2 className="itinerary-heading-serif" id="itinerary-title">
                YOUR JOURNEY THROUGH {destName}
              </h2>
              <p className="itinerary-subtitle">"Every day is arranged around your pace, interests and budget."</p>
              <div className="gold-line-accent"></div>
            </div>

            {/* Premium Day Selector */}
            <div className="day-selector-sticky-wrap">
              <nav className="day-selector" id="day-selector" aria-label="Day selection">
                {Array.from({ length: duration }, (_, i) => i + 1).map(dayNum => (
                  <button
                    key={dayNum}
                    type="button"
                    className={`day-btn ${activeDay === dayNum ? 'active' : ''}`}
                    onClick={() => setActiveDay(dayNum)}
                  >
                    DAY {String(dayNum).padStart(2, '0')}
                  </button>
                ))}
              </nav>
            </div>

            {/* Travel Journal Day Title Header & Daily Feasibility */}
            <div className="day-journal-header" id="day-journal-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="journal-day-badge" id="journal-day-num">
                    DAY {String(activeDay).padStart(2, '0')}
                  </div>
                  <h3 className="journal-day-title" id="journal-day-title" style={{ margin: 0 }}>
                    {currentDayData.dayTitle || `EXPLORING ${destName}`}
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {hasUnsavedChanges ? (
                    <span className="unsaved-badge">● UNSAVED EDITS</span>
                  ) : isSaved ? (
                    <span className="saved-badge">✓ SAVED</span>
                  ) : null}
                  <button
                    type="button"
                    className="act-btn"
                    onClick={() => openReplaceModal(activeDay, -1, 'Add Place')}
                    style={{ background: 'rgba(214, 181, 109, 0.15)', borderColor: '#D6B56D', color: '#D6B56D' }}
                  >
                    + Add Place
                  </button>
                </div>
              </div>
            </div>

            {/* Daily Feasibility Metric Pill & Travel Window */}
            {currentDayData.feasibility && (
              <div className="day-feasibility-bar" style={{
                margin: '14px 0 20px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                <span className="badge-tag-pill" style={{
                  background: currentDayData.feasibility.status === 'tight' ? 'rgba(200, 121, 85, 0.25)' : 'rgba(214, 181, 109, 0.2)',
                  border: `1px solid ${currentDayData.feasibility.status === 'tight' ? '#C87955' : '#D6B56D'}`,
                  color: currentDayData.feasibility.status === 'tight' ? '#C87955' : '#D6B56D',
                  fontSize: '0.74rem'
                }}>
                  {currentDayData.feasibility.status === 'tight'
                    ? '⚠️ TIGHT DAY SCHEDULE'
                    : currentDayData.feasibility.status === 'relaxed'
                    ? 'RELAXED DAY PACING'
                    : 'OPTIMAL DAY PACING'} · ~{currentDayData.feasibility.totalDayHours}h Planned ({currentDayData.feasibility.dailyBudgetHours}h Budget)
                </span>
                <span className="badge-tag-pill" style={{
                  background: currentDayData.feasibility.routeQuality === 'road_network' ? 'rgba(214, 181, 109, 0.25)' : 'rgba(200, 121, 85, 0.15)',
                  border: `1px solid ${currentDayData.feasibility.routeQuality === 'road_network' ? '#D6B56D' : '#C87955'}`,
                  color: currentDayData.feasibility.routeQuality === 'road_network' ? '#D6B56D' : '#E8DCC7',
                  fontSize: '0.72rem'
                }}>
                  {currentDayData.feasibility.routeQuality === 'road_network'
                    ? '✓ ROAD ROUTED (OSRM)'
                    : currentDayData.feasibility.routeQuality === 'estimate'
                    ? '~ EST. TRANSIT'
                    : '• UNMAPPED TRANSIT'}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#E8DCC7', opacity: 0.8 }}>
                  ({currentDayData.feasibility.totalVisitHours}h visits + {currentDayData.feasibility.totalTransitHours}h transit)
                </span>
              </div>
            )}

            {/* Daily Feasibility Actionable Warnings */}
            {currentDayData.feasibility?.warnings && currentDayData.feasibility.warnings.length > 0 && (
              <div className="feasibility-warnings-box" style={{
                background: 'rgba(200, 121, 85, 0.12)',
                borderLeft: '3px solid #C87955',
                padding: '10px 16px',
                marginBottom: '22px',
                borderRadius: '2px',
                fontSize: '0.82rem',
                color: '#F4EFE3'
              }}>
                {currentDayData.feasibility.warnings.map((warn, wIdx) => {
                  const isSuggestion = warn.startsWith('Suggestion:');
                  return (
                    <div
                      key={wIdx}
                      style={{
                        marginBottom: wIdx === currentDayData.feasibility.warnings.length - 1 ? 0 : '6px',
                        padding: isSuggestion ? '6px 10px' : '0',
                        background: isSuggestion ? 'rgba(214, 181, 109, 0.15)' : 'transparent',
                        borderLeft: isSuggestion ? '3px solid #D6B56D' : 'none',
                        color: isSuggestion ? '#D6B56D' : '#F4EFE3'
                      }}
                    >
                      {isSuggestion ? `💡 ${warn}` : warn}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Timeline / Travel Journal Content */}
            <div className="travel-journal-container" id="timeline-container">
              {(!currentDayData.activities || currentDayData.activities.length === 0) ? (
                <div className="empty-day-banner">
                  <h4>NO ACTIVITIES SCHEDULED FOR DAY {activeDay}</h4>
                  <p>
                    You have removed all activities from this day. You can add an unused place from the destination catalog or move activities here from another day.
                  </p>
                  <button
                    type="button"
                    className="btn-select-place"
                    onClick={() => openReplaceModal(activeDay, -1, 'Add Place')}
                    style={{ padding: '10px 24px', fontSize: '0.8rem' }}
                  >
                    + ADD PLACE FROM CATALOG
                  </button>
                </div>
              ) : (
                currentDayData.activities?.map((act, idx) => {
                const layoutClass = act.layout || (idx % 2 === 0 ? 'image-right' : 'image-left');
                const imgLabel = act.imageLabel || `${act.title.toUpperCase()} \u00B7 ${act.cat}`;
                const actImgSrc = resolveImage(act.title, act.image);

                const prevAct = idx > 0 ? currentDayData.activities[idx - 1] : null;
                const transit = prevAct?.transitToNext || (currentRoute?.legs && currentRoute.legs[idx - 1]) || null;
                const hasTransitInfo = transit && typeof transit.distanceKm === 'number' && typeof transit.durationMin === 'number';

                return (
                  <React.Fragment key={idx}>
                    {idx > 0 && (
                      <div className="activity-transit-row">
                        <div className="transit-badge-pill">
                          <span className="transit-arrow">↕</span>
                          {hasTransitInfo ? (
                            <>
                              <span className="transit-time">~{transit.durationMin} MIN</span>
                              <span className="transit-dist">({transit.distanceKm} KM)</span>
                              <span className={`transit-chip ${transit.isEstimated ? 'est' : 'road'}`}>
                                {transit.isEstimated ? 'Est. Transit' : 'Road Route (OSRM)'}
                              </span>
                            </>
                          ) : (
                            <span className="transit-unmapped">
                              Transit unmapped / self-guided
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <div
                      className={`activity-card-row ${layoutClass}`}
                      style={{ animationDelay: `${idx * 0.1}s` }}
                    >
                    <div className="activity-time-col">
                      <span className="activity-time-text">{act.time}</span>
                      {act.visitDurationHours && (
                        <span style={{ fontSize: '0.72rem', color: '#D6B56D', opacity: 0.9, display: 'block', marginTop: '4px' }}>
                          ~{act.visitDurationHours}h visit
                        </span>
                      )}
                    </div>
                    <div className="activity-main-content">
                      <div className="activity-text-box">
                        <h4>{act.title}</h4>
                        <p className="activity-desc">{act.desc}</p>
                        <span className="activity-cat-tag">{act.cat}</span>

                        {/* Phase 3 Activity Editing Controls */}
                        <div className="activity-actions-bar">
                          <button
                            type="button"
                            className="act-btn"
                            disabled={idx === 0 || isRecalculating}
                            onClick={() => handleMoveActivity(activeDay, idx, -1)}
                            title="Move earlier in this day"
                          >
                            ↑ Move Up
                          </button>
                          <button
                            type="button"
                            className="act-btn"
                            disabled={idx === (currentDayData.activities?.length || 1) - 1 || isRecalculating}
                            onClick={() => handleMoveActivity(activeDay, idx, 1)}
                            title="Move later in this day"
                          >
                            ↓ Move Down
                          </button>
                          {daysList.length > 1 && (
                            <button
                              type="button"
                              className="act-btn"
                              disabled={isRecalculating}
                              onClick={() => openMoveDayModal(activeDay, idx, act.title)}
                              title="Move to another day"
                            >
                              ⇄ Move to Day...
                            </button>
                          )}
                          <button
                            type="button"
                            className="act-btn act-btn-replace"
                            disabled={isRecalculating}
                            onClick={() => openReplaceModal(activeDay, idx, act.title)}
                            title="Replace with an unused place from catalog"
                          >
                            ↻ Replace
                          </button>
                          <button
                            type="button"
                            className="act-btn act-btn-remove"
                            disabled={isRecalculating}
                            onClick={() => handleRemoveActivity(activeDay, idx)}
                            title="Remove from itinerary"
                          >
                            ✕ Remove
                          </button>
                        </div>
                      </div>
                      <div
                        className="activity-image-wrap image-placeholder"
                        style={{ cursor: 'pointer' }}
                        title="Click to view full image"
                        onClick={() => openLightbox(act.title, act.desc, act.cat, actImgSrc, imgLabel)}
                      >
                        {actImgSrc && (
                          <img
                            src={actImgSrc}
                            alt={act.title}
                            className="activity-img-element loaded"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                        <div className="placeholder-overlay">
                          <span className="placeholder-badge">[ {imgLabel} ]</span>
                        </div>
                        <div className="view-place-badge">VIEW PLACE</div>
                      </div>
                    </div>
                  </div>
                  </React.Fragment>
                );
              }))}
            </div>
          </div>
        </section>

        {/* SECTION 4: ROUTE VISUALIZATION (Very Dark Green) */}
        <section className="section-routing reveal-on-scroll" id="routing-section">
          <div className="container">
            <div className="routing-header">
              <span className="section-eyebrow gold-eyebrow">INTELLIGENT SEQUENCING</span>
              <h2 className="section-title-serif gold-title">WHY THIS ROUTE?</h2>
              <p className="routing-desc">
                Today's experiences are grouped logically to reduce unnecessary travel time, giving you more freedom to explore at your own pace.
              </p>
              <div style={{ marginTop: "14px", display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                <span className="badge-tag-pill" style={{
                  background: routeProvider === "osrm" ? "rgba(214, 181, 109, 0.2)" : "rgba(200, 121, 85, 0.2)",
                  border: `1px solid ${routeProvider === "osrm" ? "#D6B56D" : "#C87955"}`,
                  color: routeProvider === "osrm" ? "#D6B56D" : "#C87955",
                  fontSize: "0.74rem"
                }}>
                  {routeProvider === "osrm"
                    ? "REAL ROAD NETWORK (OSRM)"
                    : hasValidRoute
                    ? "GEODESIC ESTIMATE (HAVERSINE)"
                    : "TRAVEL ROUTE UNMAPPED"}
                </span>
                {hasValidRoute && isRouteEstimated && (
                  <span className="badge-tag-pill" style={{ fontSize: "0.74rem", opacity: 0.85 }}>
                    1.35x Urban Road Tortuosity
                  </span>
                )}
              </div>
            </div>

            {/* SVG Route Canvas Container */}
            <div className="route-visualization-wrapper">
              <div className="route-svg-canvas" id="route-svg-canvas">
                {hasRealGeometry ? (
                  <svg width="100%" height="180" viewBox="0 0 800 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d={pathD} stroke="#D6B56D" strokeWidth="3" strokeLinecap="round" opacity="0.4" strokeDasharray="6 6" />
                    <path d={pathD} stroke="#D6B56D" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
                    {points.map((pt, idx) => {
                      const isEdge = idx === 0 || idx === points.length - 1;
                      const r = isEdge ? 7 : 9;
                      const color = isEdge ? "#C87955" : "#D6B56D";
                      const textY = pt.y > 90 ? Math.min(172, pt.y + 22) : Math.max(16, pt.y - 14);
                      const shortLabel = pt.name.length > 18 ? pt.name.substring(0, 16) + "..." : pt.name;

                      return (
                        <g key={idx}>
                          <circle cx={pt.x} cy={pt.y} r={r + 4} fill="#071D1A" stroke={color} strokeWidth="1.5" opacity="0.8" />
                          <circle cx={pt.x} cy={pt.y} r={r} fill={color} />
                          <text
                            x={pt.x}
                            y={textY}
                            textAnchor="middle"
                            fill="#F4EFE3"
                            fontFamily="sans-serif"
                            fontSize="11"
                            fontWeight="600"
                            letterSpacing="1"
                          >
                            {shortLabel.toUpperCase()}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                ) : (
                  <div className="route-unmapped-placeholder">
                    <span className="unmapped-icon">◈</span>
                    <h4 className="unmapped-title">NO FIXED ROUTE LINE</h4>
                    <p className="unmapped-desc">
                      {currentDayData?.isExplorationDay
                        ? "Self-guided neighborhood discovery day without fixed transit coordinates."
                        : "Activities for this day are self-guided or lack coordinates. Transit path is not measured."}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Bar */}
            <div className="routing-stats-bar">
              <div className="route-stat-item">
                <span className="route-stat-num" id="stat-places">{placesCount}</span>
                <span className="route-stat-label">STOPS TODAY</span>
              </div>
              <div className="route-stat-divider"></div>
              <div className="route-stat-item">
                <span className="route-stat-num" id="stat-movement">
                  {movementKm !== null ? `${movementKm} KM` : '--'}
                </span>
                <span className="route-stat-label">
                  {hasValidRoute ? (isRouteEstimated ? "EST. DISTANCE" : "ROAD DISTANCE") : "ROUTE DISTANCE"}
                </span>
              </div>
              <div className="route-stat-divider"></div>
              <div className="route-stat-item">
                <span className="route-stat-num" id="stat-saved">
                  {travelDurationMin !== null ? `${travelDurationMin} MIN` : '--'}
                </span>
                <span className="route-stat-label">
                  {hasValidRoute ? (isRouteEstimated ? "EST. TRAVEL TIME" : "ROAD TRAVEL TIME") : "EST. TRAVEL TIME"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: BUDGET SECTION (Deep Forest Green) */}
        <section className="section-budget reveal-on-scroll" id="budget-section">
          <div className="container">
            <div className="budget-header">
              <span className="section-eyebrow gold-eyebrow">TRANSPARENT COST ALLOCATION</span>
              <h2 className="section-title-serif gold-title">YOUR BUDGET</h2>
              <div className="budget-total-hero" id="budget-total">
                ₹{budget.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="budget-card-container">
              {/* Animated Segmented Bar */}
              <div className="budget-bar-outer">
                <div className="budget-bar" id="budget-bar" ref={budgetBarRef}>
                  {breakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="budget-segment"
                      style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                      onMouseEnter={(e) => handleBudgetHover(item, e)}
                      onMouseMove={(e) => handleBudgetHover(item, e)}
                      onMouseLeave={() => setBudgetTooltip(prev => ({ ...prev, visible: false }))}
                    ></div>
                  ))}
                </div>
                {/* Tooltip */}
                <div
                  className={`budget-tooltip ${budgetTooltip.visible ? 'active' : ''}`}
                  style={{ left: `${budgetTooltip.x}px` }}
                >
                  {budgetTooltip.text}
                </div>
              </div>

              {/* Breakdown Grid */}
              <div className="budget-grid" id="budget-grid">
                {breakdown.map((item, idx) => {
                  const segmentVal = Math.round(budget * (item.pct / 100));
                  return (
                    <div key={idx} className="budget-grid-item">
                      <div className="bg-item-name">
                        <div className="bg-item-dot" style={{ backgroundColor: item.color }}></div>
                        <span>{item.name}</span>
                      </div>
                      <div className="bg-item-val">₹{segmentVal.toLocaleString('en-IN')}</div>
                      <div className="bg-item-pct">{item.pct}%</div>
                    </div>
                  );
                })}
              </div>

              {/* Pace Insight */}
              <div className="budget-insight-box" id="budget-insight-box">
                <span className="insight-label">YOUR PACE</span>
                <p className="insight-text" id="budget-insight-text">
                  {travelStyle === 'Relaxed'
                    ? '"More breathing room between experiences. Your relaxed travel style keeps the itinerary comfortable while staying within your selected budget."'
                    : travelStyle === 'Packed'
                    ? '"More experiences with less downtime. Your packed travel style maximizes every hour while staying within your selected budget."'
                    : '"A comfortable mix of exploration and downtime. Your balanced travel style keeps the itinerary comfortable while staying within your selected budget."'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: BUILT AROUND YOU (Warm Ivory) */}
        <section className="section-built-around reveal-on-scroll" id="built-around-section">
          <div className="container">
            <div className="section-header-editorial">
              <span className="section-eyebrow">TAILORED EXPERIENCE</span>
              <h2 className="section-title-serif">BUILT AROUND YOU</h2>
              <p className="section-subtitle-dark">YOUR INTERESTS SHAPED THIS JOURNEY.</p>
            </div>

            {/* Dynamic Interest Panels */}
            <div className="interests-panels-grid" id="interests-breakdown">
              {interests.length === 0 ? (
                <div className="interest-panel-card">
                  <div
                    className="interest-image-wrap image-placeholder"
                    style={{ cursor: 'pointer' }}
                    title="Click to view full image"
                    onClick={() => openLightbox('BALANCED EXPLORATION', 'We curated a balanced mix of cultural landmarks, local cuisine, and relaxing walks tailored to your budget.', 'PERSONALIZATION', '/images/manali/rohtangpass.jpg', 'BALANCED EXPLORATION IMAGE')}
                  >
                    <img
                      src="/images/manali/rohtangpass.jpg"
                      alt="Balanced Exploration"
                      className="interest-img-element loaded"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="placeholder-overlay">
                      <span className="placeholder-badge">[ BALANCED EXPLORATION IMAGE ]</span>
                    </div>
                    <div className="view-place-badge">VIEW PLACE</div>
                  </div>
                  <div className="interest-panel-body">
                    <h4 className="interest-panel-title">BALANCED EXPLORATION</h4>
                    <p className="interest-panel-desc">We curated a balanced mix of cultural landmarks, local cuisine, and relaxing walks tailored to your budget.</p>
                  </div>
                </div>
              ) : (
                interests.map((interest) => {
                  const explanation = interestExplanations[interest] || 'Tailored to your personal travel preferences.';
                  const intImgSrc = interestImages[interest] || '/images/manali/rohtangpass.jpg';

                  return (
                    <div key={interest} className="interest-panel-card">
                      <div
                        className="interest-image-wrap image-placeholder"
                        style={{ cursor: 'pointer' }}
                        title="Click to view full image"
                        onClick={() => openLightbox(interest, explanation, 'INTEREST', intImgSrc, `${interest.toUpperCase()} · INTEREST IMAGE`)}
                      >
                        <img
                          src={intImgSrc}
                          alt={interest}
                          className="interest-img-element loaded"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div className="placeholder-overlay">
                          <span className="placeholder-badge">[ {interest.toUpperCase()} &middot; INTEREST IMAGE ]</span>
                        </div>
                        <div className="view-place-badge">VIEW PLACE</div>
                      </div>
                      <div className="interest-panel-body">
                        <h4 className="interest-panel-title">{interest}</h4>
                        <p className="interest-panel-desc">{explanation}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Personalization Badge Banner */}
            <div className="personalization-badge-banner">
              <div className="badge-header-label">PLANNED FOR YOUR PACE</div>
              <div className="badge-tags-row" id="personalization-badges">
                <span className="badge-tag-pill">
                  {interests.length > 0 ? interests.join(' \u2022 ') : 'General'}
                </span>
                <span className="badge-tag-pill">{travelStyle} Pace</span>
                <span className="badge-tag-pill">{duration} Days</span>
                <span className="badge-tag-pill">₹{budget.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6.5: VERIFIED PLACES & DINING (Live & Curated Places) */}
        {places.length > 0 && (
          <section className="section-places-discovery reveal-on-scroll" id="places-section">
            <div className="container">
              <div className="section-header-editorial" style={{ textAlign: 'left', marginBottom: '24px' }}>
                <span className="section-eyebrow gold-eyebrow">VERIFIED LOCAL DISCOVERIES</span>
                <h2 className="section-title-serif" style={{ color: 'var(--paper)', fontSize: '2.2rem' }}>
                  EXPLORE {destName}'S LANDMARKS & DINING
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: '0.92rem', marginTop: '6px' }}>
                  Real sights and authentic dining venues discovered for your destination, verified across global databases.
                </p>
              </div>

              <div className="places-grid">
                {places.map((place, idx) => (
                  <article key={place.placeId || idx} className="verified-place-card">
                    <div className="place-img-wrap">
                      <img
                        src={place.photoUrl || heroImgSrc}
                        alt={place.name}
                        className="place-img"
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = heroImgSrc || '/images/newdelhi/indiagate.jpg';
                        }}
                      />
                      <span className="place-category-pill">
                        {place.category === 'restaurant' ? 'Dining' : 'Attraction'}
                      </span>
                    </div>

                    <div className="place-body">
                      <h3 className="place-name">{place.name}</h3>
                      <p className="place-address">{place.address || `${destName}, ${countryName}`}</p>

                      <div className="place-meta-row">
                        <div className="place-rating">
                          {place.rating ? (
                            <>
                              <span>&#9733;</span>
                              <span>{place.rating.toFixed(1)}</span>
                              {place.reviewCount && (
                                <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '0.72rem', marginLeft: '3px' }}>
                                  ({place.reviewCount.toLocaleString('en-IN')})
                                </span>
                              )}
                            </>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontWeight: 500 }}>Unrated venue</span>
                          )}
                        </div>

                        <span className="place-source-tag">
                          {place.source === 'google-places-new'
                            ? 'Google Places'
                            : place.source === 'foursquare-places'
                            ? 'Foursquare'
                            : 'Dastaan Verified'}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* SECTION 7: FINAL CINEMATIC CTA SECTION (Dark Closing) */}
        <section className="section-final reveal-on-scroll" id="final-section">
          <div className="final-bg-placeholder image-placeholder">
            {heroImgSrc && (
              <img
                id="final-bg-img"
                src={heroImgSrc}
                alt="Destination Backdrop"
                className="final-img-element loaded"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <div className="placeholder-overlay">
              <span className="placeholder-badge" id="final-placeholder-badge">
                [ {destName} CINEMATIC BACKDROP ]
              </span>
            </div>
            <div className="final-dark-overlay"></div>
          </div>

          <div className="container final-content-layer">
            <span className="section-eyebrow gold-eyebrow">YOUR JOURNEY IS READY</span>
            <h2 className="final-heading-serif">ALL THAT'S LEFT IS TO GO.</h2>

            <div className="final-dest-summary" id="final-dest-summary">
              {destName} &bull; {duration} DAYS &bull; ₹{budget.toLocaleString('en-IN')}
            </div>

            {/* CTA Buttons Hierarchy */}
            <div className="final-actions-wrapper">
              <button
                type="button"
                className="btn-primary-gold"
                id="btn-save"
                onClick={handleSaveJourney}
                disabled={isSaving}
                style={isSaved ? { background: '#F4EFE3', color: '#071D1A' } : {}}
              >
                <span>{isSaving ? 'SAVING JOURNEY...' : hasUnsavedChanges ? 'SAVE EDITED JOURNEY \u2192' : isSaved ? '\u2713 JOURNEY SAVED' : 'SAVE MY JOURNEY \u2192'}</span>
              </button>
              <button type="button" className="btn-secondary-outline" id="btn-edit" onClick={handleEditPreferences}>
                EDIT PREFERENCES
              </button>
              <button type="button" className="btn-tertiary-link" id="btn-reset" onClick={handleStartOver}>
                START OVER
              </button>
            </div>

            {/* Save Confirmation Toast Container */}
            <div className={`save-toast-banner ${showToast ? 'active' : ''} ${toastInfo.type === 'error' ? 'toast-error' : ''}`} id="save-toast" aria-live="polite">
              <div className="toast-icon" style={toastInfo.type === 'error' ? { background: '#C87955', color: '#fff' } : {}}>
                {toastInfo.type === 'error' ? '!' : '\u2713'}
              </div>
              <div className="toast-text">
                <strong>{toastInfo.title}</strong>
                <span id="toast-sub">{toastInfo.message}</span>
                {toastInfo.type === 'success' && (
                  <button
                    type="button"
                    onClick={() => navigate('/profile')}
                    style={{
                      marginTop: '8px',
                      background: 'none',
                      border: 'none',
                      color: '#D6B56D',
                      fontSize: '12px',
                      fontWeight: '700',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    View in My Profile &rarr;
                  </button>
                )}
                {toastInfo.type === 'error' && !auth.currentUser && !getCurrentUser() && (
                  <button
                    type="button"
                    onClick={() => navigate('/auth?redirect=/itinerary')}
                    style={{
                      marginTop: '8px',
                      background: 'none',
                      border: 'none',
                      color: '#D6B56D',
                      fontSize: '12px',
                      fontWeight: '700',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    Go to Sign In &rarr;
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <LightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        data={lightboxData}
      />

      <Footer />
    </div>
  );
}
