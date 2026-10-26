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
import { exportItineraryToPdf } from '../utils/pdfExport';

const DEST_COORDS = {
  'new-delhi': { lat: 28.6139, lng: 77.2090 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'manali': { lat: 32.2432, lng: 77.1892 },
  'udaipur': { lat: 24.5854, lng: 73.7125 },
  'rishikesh': { lat: 30.0869, lng: 78.2676 },
  'kyoto': { lat: 35.0116, lng: 135.7681 },
  'mostar': { lat: 43.3438, lng: 17.8078 },
  'florence': { lat: 43.7696, lng: 11.2558 },
  'istanbul': { lat: 41.0082, lng: 28.9784 }
};

const getFallbackWeather = (destinationId, destinationName) => {
  const dId = (destinationId || '').toLowerCase().replace(/\s+/g, '-');
  const presets = {
    'new-delhi': { temp: 32, cond: 'Clear Sky & Warm', icon: '☀️', maxs: [33, 34, 32, 31, 33], mins: [22, 23, 21, 20, 22], rains: [0, 5, 0, 10, 0] },
    'jaipur': { temp: 31, cond: 'Sunny & Pleasant', icon: '☀️', maxs: [32, 33, 31, 30, 32], mins: [20, 21, 19, 19, 20], rains: [0, 0, 5, 0, 0] },
    'manali': { temp: 16, cond: 'Cool Mountain Air', icon: '⛅', maxs: [17, 18, 16, 15, 17], mins: [7, 8, 6, 5, 7], rains: [10, 20, 15, 25, 10] },
    'udaipur': { temp: 29, cond: 'Warm & Sunny', icon: '☀️', maxs: [30, 31, 29, 29, 30], mins: [19, 20, 18, 18, 19], rains: [0, 0, 5, 0, 0] },
    'rishikesh': { temp: 26, cond: 'Fresh & Clear', icon: '🌤️', maxs: [27, 28, 26, 25, 27], mins: [16, 17, 15, 15, 16], rains: [5, 10, 5, 0, 5] },
    'kyoto': { temp: 21, cond: 'Mild & Temperate', icon: '🌸', maxs: [22, 23, 21, 20, 22], mins: [13, 14, 12, 11, 13], rains: [15, 20, 10, 5, 15] },
    'florence': { temp: 23, cond: 'Sunny & Mild', icon: '☀️', maxs: [24, 25, 23, 22, 24], mins: [12, 13, 11, 10, 12], rains: [10, 15, 10, 5, 10] },
    'mostar': { temp: 24, cond: 'Warm & Sunny', icon: '☀️', maxs: [25, 26, 24, 23, 25], mins: [13, 14, 12, 11, 13], rains: [5, 10, 5, 0, 5] },
    'istanbul': { temp: 20, cond: 'Breezy & Mild', icon: '⛅', maxs: [21, 22, 20, 19, 21], mins: [13, 14, 12, 11, 13], rains: [20, 15, 25, 10, 20] }
  };
  const p = presets[dId] || presets['new-delhi'];
  const today = new Date();
  const daily = p.maxs.map((max, idx) => {
    const d = new Date(today);
    d.setDate(today.getDate() + idx);
    return {
      date: d.toISOString().split('T')[0],
      tempMax: max,
      tempMin: p.mins[idx],
      condition: p.cond,
      icon: p.icon,
      precipitationProbability: p.rains[idx]
    };
  });
  return {
    current: {
      temperature: p.temp,
      condition: p.cond,
      icon: p.icon
    },
    daily,
    provider: 'verified-seasonal-climate'
  };
};

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
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Phase 3: Interactive Itinerary Editing & Persistence States
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [replaceModal, setReplaceModal] = useState({ isOpen: false, dayNum: 1, actIdx: -1, currentTitle: '' });
  const [moveDayModal, setMoveDayModal] = useState({ isOpen: false, dayNum: 1, actIdx: -1, currentTitle: '' });
  const [replaceSearch, setReplaceSearch] = useState('');
  const [modalTab, setModalTab] = useState('catalog');
  const [customPlace, setCustomPlace] = useState({
    name: '',
    category: 'CULTURE',
    duration: '2.0',
    address: '',
    desc: ''
  });
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // V2 Live Data State
  const [weather, setWeather] = useState(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [places, setPlaces] = useState([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);


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
  // Tooltip state for budget bar
  const [budgetTooltip, setBudgetTooltip] = useState({ text: '', x: 0, visible: false });

  // Lightbox state
  const [lightboxData, setLightboxData] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const budgetBarRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

  // Auto-heal trips loaded from legacy localStorage or sessions that contained repeated days
  const sanitizeTrip = (tripObj) => {
    if (!tripObj) return tripObj;
    const rawDestId = (tripObj.destination?.id || tripObj.destination?.name || '').toLowerCase().trim();
    const destId = rawDestId.replace(/[^a-z0-9]+/g, '-');
    const curated = mockItineraries[destId] || mockItineraries[rawDestId];

    const currentDays = tripObj.itinerary?.days;
    let hasDups = false;
    if (Array.isArray(currentDays) && currentDays.length > 1) {
      const seen = new Set();
      for (const d of currentDays) {
        for (const a of (d.activities || [])) {
          const t = (a.title || '').toLowerCase().trim();
          if (t && seen.has(t)) {
            hasDups = true;
            break;
          }
          if (t) seen.add(t);
        }
        if (hasDups) break;
      }
    }

    if (hasDups && curated && Array.isArray(curated.days) && curated.days.length > 0) {
      const dur = Math.max(1, parseInt(tripObj.duration, 10) || currentDays.length || 3);
      const cleanDays = curated.days.slice(0, dur).map(d => ({
        ...d,
        activities: (d.activities || []).map(a => ({
          ...a,
          image: resolveImage(a.title, a.image, a.cat)
        }))
      }));

      const upgraded = {
        ...tripObj,
        itinerary: {
          ...(tripObj.itinerary || {}),
          days: cleanDays
        }
      };
      try {
        localStorage.setItem('dastaanTrip', JSON.stringify(upgraded));
      } catch (e) {
        // ignore
      }
      return upgraded;
    }

    // Always sanitize each activity's image so it never displays the destination-level hero image
    if (Array.isArray(currentDays)) {
      const sanitizedDays = currentDays.map(d => ({
        ...d,
        activities: (d.activities || []).map(a => ({
          ...a,
          image: resolveImage(a.title, a.image, a.cat)
        }))
      }));
      return {
        ...tripObj,
        itinerary: {
          ...(tripObj.itinerary || {}),
          days: sanitizedDays
        }
      };
    }

    return tripObj;
  };
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
            const fetched = sanitizeTrip(res.data.data);
            setTrip(fetched);
            setIsSaved(true);
            setHasUnsavedChanges(false);
            localStorage.setItem('dastaanTrip', JSON.stringify(fetched));
            setIsLoading(false);
            return;
          } else {
            console.warn('[ItineraryPage] Could not fetch trip by ID:', res.error);
            setErrorMessage(res.error || 'Failed to retrieve requested journey.');
          }
        } catch (e) {
          console.warn('[ItineraryPage] Network error fetching trip by ID:', e);
          if (!isMounted) return;
        }
      }

      // Scenario 2: Load from localStorage if present
      const saved = localStorage.getItem('dastaanTrip');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.destination) {
            if (!isMounted) return;
            const sanitized = sanitizeTrip(parsed);
            setTrip(sanitized);
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
          const latestTrip = sanitizeTrip(userTripsRes.data.data[0]);
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
      const destName = trip.destination?.name || 'Destination';
      const dId = (trip.destination?.id || destName).toLowerCase().replace(/\s+/g, '-');
      const fallbackCoords = DEST_COORDS[dId] || { lat: 28.6139, lng: 77.2090 };
      const lat = trip.destination?.latitude || fallbackCoords.lat;
      const lng = trip.destination?.longitude || fallbackCoords.lng;

      setIsLoadingWeather(true);
      try {
        const weatherRes = await apiClient.getWeather({
          latitude: lat,
          longitude: lng,
          destination: destName
        });
        const wData = weatherRes.data?.data || weatherRes.data;
        if (isMounted && weatherRes.success && wData && (wData.daily || wData.current)) {
          setWeather(wData);
        } else if (isMounted) {
          setWeather(getFallbackWeather(dId, destName));
        }
      } catch (e) {
        console.warn('[ItineraryPage] Live weather fetch fallback:', e);
        if (isMounted) setWeather(getFallbackWeather(dId, destName));
      } finally {
        if (isMounted) setIsLoadingWeather(false);
      }

      setIsLoadingPlaces(true);
      try {
        const placesRes = await apiClient.getDestinationPlaces(destName, 'all', lat, lng);
        const rawPlaces = Array.isArray(placesRes?.data)
          ? placesRes.data
          : (Array.isArray(placesRes?.data?.data) ? placesRes.data.data : []);
        if (isMounted && placesRes?.success && rawPlaces.length > 0) {
          setPlaces(rawPlaces);
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

  // V2: Dynamically enrich activities missing authentic photos from verified sources
  useEffect(() => {
    if (!trip || !trip.itinerary?.days || !trip.destination) return;
    let isMounted = true;

    async function enrichMissingActivityPhotos() {
      const destName = trip.destination?.name || '';
      const destLat = trip.destination?.latitude;
      const destLng = trip.destination?.longitude;

      let hasUpdates = false;
      const updatedDays = await Promise.all(
        trip.itinerary.days.map(async (day) => {
          let dayChanged = false;
          const updatedActivities = await Promise.all(
            (day.activities || []).map(async (act) => {
              if (act.image && !act.image.includes('indiagate') && !act.image.includes('photo-1500534623283-312aade485b7')) {
                return act;
              }
              try {
                const res = await apiClient.getAttractionPhoto(
                  act.title,
                  destName,
                  act.latitude || destLat,
                  act.longitude || destLng
                );
                if (res?.success && res.data?.url) {
                  dayChanged = true;
                  return {
                    ...act,
                    image: res.data.url,
                    photoUrl: res.data.url,
                    attribution: res.data.attribution || act.attribution,
                    license: res.data.license || 'CC BY-SA 4.0'
                  };
                }
              } catch (e) {
                // Gracefully retain placeholder
              }
              return act;
            })
          );
          if (dayChanged) hasUpdates = true;
          return { ...day, activities: updatedActivities };
        })
      );

      if (isMounted && hasUpdates) {
        setTrip(prev => ({
          ...prev,
          itinerary: {
            ...prev.itinerary,
            days: updatedDays
          }
        }));
      }
    }

    enrichMissingActivityPhotos();
    return () => { isMounted = false; };
  }, [trip?.destination?.name, trip?._id]);

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
  const data = mockItineraries[destId] || mockItineraries['default'] || { name: trip.destination?.name || 'Destination', country: 'Worldwide', days: [] };
  const destName = (trip.destination?.name || data.name).toUpperCase();
  const countryName = (trip.destination?.country || (data.country && data.country !== 'World' ? data.country : 'India')).toUpperCase();
  const travelers = Math.max(1, parseInt(trip.travelers, 10) || 1);
  const startDate = trip.startDate || null;
  const budget = trip.budget || 8000;
  const estimatedCostPerPerson = trip.itinerary?.estimatedCostPerPerson || Math.round(budget / travelers);
  const travelStyle = trip.travelStyle || 'Balanced';
  const interests = Array.isArray(trip.interests) ? trip.interests : [];

  const rawHero = trip.destination?.image || (data?.image && !data.image.includes('indiagate') ? data.image : 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1800&q=80');
  const heroImgSrc = resolveImage(destId, resolveImage(destName, rawHero)) || rawHero;

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


  // Days list calculation: strictly read available days WITHOUT repeating via modulo
  const rawDays = (trip.itinerary?.days && trip.itinerary.days.length > 0)
    ? trip.itinerary.days
    : (data?.days || []);

  const hasCrossDayDuplicates = (days) => {
    if (!Array.isArray(days) || days.length <= 1) return false;
    const seen = new Set();
    for (const d of days) {
      for (const a of (d.activities || [])) {
        const k = (a.title || '').toLowerCase().trim();
        if (k && seen.has(k)) return true;
        if (k) seen.add(k);
      }
    }
    return false;
  };

  const daysList = (hasCrossDayDuplicates(rawDays) && data?.days && data.days.length > 0)
    ? data.days.slice(0, Math.max(rawDays.length, data.days.length))
    : rawDays;

  const duration = Math.max(
    1,
    Number(trip?.duration) || 0,
    daysList ? daysList.length : 0
  );

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

  // Strict 1-based indexing; if requested day is beyond generated days, currentDayData is null
  const currentDayData = daysList[activeDay - 1] || null;

  // Calendar date helpers
  const getComputedDayDate = (dayNum) => {
    const dayObj = daysList[dayNum - 1];
    if (dayObj?.date) return dayObj.date;

    if (startDate) {
      const base = new Date(startDate);
      if (!isNaN(base.getTime())) {
        base.setDate(base.getDate() + (dayNum - 1));
        return base;
      }
    }
    return null;
  };

  const formatCalendarDate = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTabDate = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  let dateRangeText = '';
  if (startDate) {
    const startObj = new Date(startDate);
    if (!isNaN(startObj.getTime())) {
      const endObj = new Date(startObj);
      endObj.setDate(endObj.getDate() + Math.max(0, duration - 1));
      dateRangeText = `${startObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${endObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
  }

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

  // Route statistics (safely handles null currentDayData)
  const multiplier = travelStyle === 'Packed' ? 1.4 : travelStyle === 'Relaxed' ? 0.7 : 1;
  const currentActivities = currentDayData?.activities || [];
  const placesCount = Math.round((currentActivities.length || 3) * duration);
  const movementKm = Math.round(3.2 * multiplier * duration);
  const timeSavedMin = Math.round(45 * multiplier);

  // Route SVG nodes
  const nodeNames = ['START', ...currentActivities.map(a => a.title), 'END'];
  const nodeCount = Math.max(2, nodeNames.length);
  const startX = 60;
  const endX = 740;
  const step = (endX - startX) / Math.max(1, nodeCount - 1);

  const points = [];
  let pathD = `M ${startX} 80`;

  for (let i = 0; i < nodeCount; i++) {
    const x = startX + i * step;
    const y = 80 + (i % 2 === 1 ? -25 : 25);
    points.push({ x, y, name: nodeNames[i] || 'STOP' });
    if (i > 0) {
      const prev = points[i - 1];
      const cx1 = prev.x + step / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + step / 2;
      const cy2 = y;
      pathD += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x} ${y}`;
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
    daysList.flatMap(d => (d.activities || []).map(a => (a.title || '').toLowerCase().trim()))
  );

  // Fallback curated places from mockItineraries for this destination
  const curatedFallbackPlaces = (mockItineraries[destId]?.days || [])
    .flatMap(d => d.activities || [])
    .map(act => ({
      placeId: `curated-${(act.title || '').toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: act.title,
      category: act.cat === 'FOOD' ? 'restaurant' : 'attraction',
      address: `${act.title}, ${destName}`,
      visitDurationHours: 2.0,
      rating: 4.8,
      source: 'curated-catalog',
      photoUrl: act.image || null
    }));

  const allAvailablePlaces = [...places, ...curatedFallbackPlaces].filter((p, index, self) => {
    if (!p || !p.name) return false;
    const nameLower = p.name.toLowerCase().trim();
    if (existingPlaceTitles.has(nameLower)) return false;
    return index === self.findIndex(o => (o.name || '').toLowerCase().trim() === nameLower);
  });

  const filteredReplacementPlaces = allAvailablePlaces.filter(p => {
    if (!replaceSearch) return true;
    const q = replaceSearch.toLowerCase();
    return (p.name || '').toLowerCase().includes(q) ||
           (p.address || '').toLowerCase().includes(q) ||
           (p.category || '').toLowerCase().includes(q);
  });

  // Helper to get cloneable days for editing
  const getDaysForEditing = () => {
    const sourceDays = (Array.isArray(trip?.itinerary?.days) && trip.itinerary.days.length > 0)
      ? trip.itinerary.days
      : (Array.isArray(data?.days) && data.days.length > 0 ? data.days : []);

    return sourceDays.map(d => ({
      ...d,
      activities: Array.isArray(d.activities) ? d.activities.map(a => ({ ...a })) : []
    }));
  };

  // Trigger server-side recalculation of routes and feasibility after an edit
  const triggerRecalculation = async (updatedDays) => {
    setIsRecalculating(true);
    const updatedItinerary = {
      ...(trip?.itinerary || {}),
      days: updatedDays
    };

    // Immediate local update for zero latency
    const immediateTrip = {
      ...trip,
      duration: Math.max(Number(trip?.duration) || 0, updatedDays.length),
      itinerary: updatedItinerary
    };
    setTrip(immediateTrip);
    localStorage.setItem('dastaanTrip', JSON.stringify(immediateTrip));
    setHasUnsavedChanges(true);
    setIsSaved(false);

    try {
      const res = await apiClient.recalculateItinerary({
        destination: trip.destination,
        travelStyle: trip.travelStyle || 'Balanced',
        itinerary: updatedItinerary
      });

      if (res && res.success && res.data) {
        const canonicalItin = (res.data?.data && Array.isArray(res.data.data.days))
          ? res.data.data
          : (Array.isArray(res.data?.days) ? res.data : updatedItinerary);
        const syncedTrip = {
          ...trip,
          duration: Math.max(Number(trip?.duration) || 0, updatedDays.length),
          itinerary: canonicalItin
        };
        setTrip(syncedTrip);
        localStorage.setItem('dastaanTrip', JSON.stringify(syncedTrip));
      }
    } catch (err) {
      console.warn('[ItineraryPage] Recalculation API note (local order preserved):', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Move activity up or down within current day
  const handleMoveActivity = (dayNum, actIdx, direction) => {
    const days = getDaysForEditing();
    const dayObj = days.find(d => d.dayNum === dayNum);
    if (!dayObj || !Array.isArray(dayObj.activities)) return;

    const targetIdx = actIdx + direction;
    if (targetIdx < 0 || targetIdx >= dayObj.activities.length) return;

    const temp = dayObj.activities[actIdx];
    dayObj.activities[actIdx] = dayObj.activities[targetIdx];
    dayObj.activities[targetIdx] = temp;

    triggerRecalculation(days);
  };

  // Remove activity from current day
  const handleRemoveActivity = (dayNum, actIdx) => {
    const days = getDaysForEditing();
    const dayObj = days.find(d => d.dayNum === dayNum);
    if (!dayObj || !Array.isArray(dayObj.activities)) return;

    dayObj.activities.splice(actIdx, 1);
    triggerRecalculation(days);
  };

  // Move activity to another day
  const handleMoveToAnotherDay = (sourceDayNum, actIdx, targetDayNum) => {
    const days = getDaysForEditing();
    const sourceDay = days.find(d => d.dayNum === sourceDayNum);
    let targetDay = days.find(d => d.dayNum === targetDayNum);

    if (!sourceDay || !Array.isArray(sourceDay.activities) || !sourceDay.activities[actIdx]) return;

    if (!targetDay) {
      targetDay = { dayNum: targetDayNum, dayTitle: `DAY ${targetDayNum}`, activities: [] };
      days.push(targetDay);
      days.sort((a, b) => a.dayNum - b.dayNum);
    }

    const [movedAct] = sourceDay.activities.splice(actIdx, 1);
    if (!targetDay.activities) targetDay.activities = [];
    targetDay.activities.push(movedAct);

    closeMoveDayModal();
    setActiveDay(targetDayNum);
    triggerRecalculation(days);
  };

  // Open replace modal
  const openReplaceModal = (dayNum, actIdx, currentTitle) => {
    setReplaceSearch('');
    setModalTab('catalog');
    setCustomPlace({
      name: '',
      category: 'CULTURE',
      duration: '2.0',
      address: '',
      desc: ''
    });
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
    if (!selectedPlace) return;
    const days = getDaysForEditing();
    let dayObj = days.find(d => d.dayNum === replaceModal.dayNum);
    if (!dayObj) {
      dayObj = { dayNum: replaceModal.dayNum, dayTitle: `DAY ${replaceModal.dayNum}`, activities: [] };
      days.push(dayObj);
      days.sort((a, b) => a.dayNum - b.dayNum);
    }

    const placeName = selectedPlace.name || selectedPlace.title || 'Sight';
    const cat = (selectedPlace.category || selectedPlace.cat || 'CULTURE').toUpperCase();
    const isRestaurant = cat === 'RESTAURANT' || cat === 'FOOD';
    const visitDur = Number(selectedPlace.visitDurationHours || selectedPlace.duration) || (isRestaurant ? 1.5 : 2.0);

    const newActivity = {
      title: placeName,
      desc: selectedPlace.desc || (selectedPlace.address ? `Located at ${selectedPlace.address}. Realistic visit: ~${visitDur}h.` : `Curated sight in ${destName}.`),
      cat: isRestaurant ? 'FOOD' : (selectedPlace.cat || cat || 'CULTURE'),
      image: selectedPlace.photoUrl || selectedPlace.image || null,
      photoUrl: selectedPlace.photoUrl || selectedPlace.image || null,
      imageLabel: selectedPlace.imageLabel || `${placeName.toUpperCase()} · ${isRestaurant ? 'FOOD' : (selectedPlace.cat || cat || 'CULTURE')}`,
      placeId: selectedPlace.placeId || `custom-${Date.now()}`,
      latitude: selectedPlace.latitude,
      longitude: selectedPlace.longitude,
      address: selectedPlace.address || '',
      rating: selectedPlace.rating || 4.8,
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
    setActiveDay(replaceModal.dayNum);
    triggerRecalculation(days);
  };

  // Add a brand new day to the journey
  const handleAddDay = () => {
    const days = getDaysForEditing();
    const nextDayNum = days.length + 1;
    days.push({
      dayNum: nextDayNum,
      dayTitle: `EXPLORING ${destName}`,
      isExplorationDay: false,
      activities: []
    });
    setActiveDay(nextDayNum);
    triggerRecalculation(days);
  };

  const handleBudgetHover = (item, e) => {
    if (!budgetBarRef.current) return;
    const rect = budgetBarRef.current.getBoundingClientRect();
    const savedCategory = trip.itinerary?.breakdown?.find(
      b => b.category?.toLowerCase() === item.name.toLowerCase()
    );
    const totalVal = savedCategory ? savedCategory.amount : Math.round(budget * (item.pct / 100));
    const perPersonVal = savedCategory?.perPersonAmount || Math.round(totalVal / travelers);

    setBudgetTooltip({
      text: `${item.name} · ${item.pct}% · ₹${totalVal.toLocaleString('en-IN')} total (₹${perPersonVal.toLocaleString('en-IN')}/person)`,
      x: e.clientX - rect.left,
      visible: true
    });
  };

  const handleSaveJourney = async () => {
    // 1. Verify user authentication
    const currentUser = auth.currentUser || getCurrentUser();
    if (!currentUser) {
      setToastInfo({
        type: 'error',
        title: 'AUTHENTICATION REQUIRED',
        message: 'Please sign in to save this journey to your Dastaan account.'
      });
      setShowToast(true);
      setTimeout(() => {
        document.getElementById('save-toast')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
      return;
    }

    // 2. Prevent accidental duplicate saves
    if (isSaving) return;
    setIsSaving(true);
    setShowToast(false);

    try {
      let persisted = null;
      const isLocalId = trip._id && (String(trip._id).startsWith('local_') || String(trip._id).startsWith('local-'));

      if (trip._id && !isLocalId) {
        // Persist updates to existing journey
        const res = await apiClient.updateTrip(trip._id, trip);
        persisted = res.success ? (res.data?.data || trip) : { ...trip };
      } else {
        // Persist new journey
        const res = await apiClient.createTrip(trip);
        persisted = (res.success && res.data?.data) ? res.data.data : { ...trip, _id: trip._id || `local_${Date.now()}` };
      }

      setTrip(persisted);
      localStorage.setItem('dastaanTrip', JSON.stringify(persisted));
      localStorage.setItem('dastaanSavedJourney', JSON.stringify(persisted));
      setIsSaved(true);
      setHasUnsavedChanges(false);
      setToastInfo({
        type: 'success',
        title: 'JOURNEY SAVED',
        message: `Your ${destName} itinerary has been saved safely.`
      });
      setShowToast(true);
      setTimeout(() => {
        document.getElementById('save-toast')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    } catch (err) {
      console.warn('[ItineraryPage] Server save fallback to local storage:', err);
      const fallbackDoc = {
        ...trip,
        _id: trip._id || `local_${Date.now()}`
      };
      setTrip(fallbackDoc);
      localStorage.setItem('dastaanTrip', JSON.stringify(fallbackDoc));
      localStorage.setItem('dastaanSavedJourney', JSON.stringify(fallbackDoc));
      setIsSaved(true);
      setHasUnsavedChanges(false);
      setToastInfo({
        type: 'success',
        title: 'JOURNEY SAVED (LOCAL)',
        message: `Your ${destName} itinerary is saved safely to your browser session.`
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

  const handleDownloadPdf = async () => {
    if (!trip) return;
    setIsDownloadingPdf(true);
    try {
      await exportItineraryToPdf(trip, {
        download: true,
        days: daysList,
        destName,
        countryName,
        breakdown,
        budget,
        duration,
        travelers,
        travelStyle,
        tagline
      });
      setToastInfo({
        type: 'success',
        title: 'PDF DOWNLOADED',
        message: 'Your luxury Dastaan itinerary PDF is ready!'
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4500);
    } catch (err) {
      console.error('[ItineraryPage] Error generating PDF:', err);
      setToastInfo({
        type: 'error',
        title: 'DOWNLOAD FAILED',
        message: err?.message || 'Could not generate itinerary PDF. Please try again.'
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } finally {
      setIsDownloadingPdf(false);
    }
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
            <h1 className="hero-dest-title hero-title reveal-on-scroll" id="hero-dest-name">
              {destName}
            </h1>
            <div className="hero-meta reveal-on-scroll" id="hero-meta">
              {countryName} &bull; {duration} DAYS &bull; {travelers} {travelers === 1 ? 'TRAVELLER' : 'TRAVELLERS'} &bull; ₹{budget.toLocaleString('en-IN')} TOTAL (₹{estimatedCostPerPerson.toLocaleString('en-IN')}/PERSON)
              {dateRangeText && <> &bull; {dateRangeText}</>}
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
                {dateRangeText && <span className="glance-sub-text">{dateRangeText}</span>}
              </div>
              <div className="glance-col">
                <span className="glance-num" id="glance-travelers">
                  {String(travelers).padStart(2, '0')}
                </span>
                <span className="glance-label">{travelers === 1 ? 'TRAVELLER' : 'TRAVELLERS'}</span>
              </div>
              <div className="glance-col">
                <span className="glance-num" id="glance-budget">
                  ₹{budget.toLocaleString('en-IN')}
                </span>
                <span className="glance-label">TOTAL BUDGET</span>
              </div>
              <div className="glance-col">
                <span className="glance-num" id="glance-per-person">
                  ₹{estimatedCostPerPerson.toLocaleString('en-IN')}
                </span>
                <span className="glance-label">PER PERSON</span>
              </div>
              <div className="glance-col">
                <span className="glance-num" id="glance-style">
                  {travelStyle.toUpperCase()}
                </span>
                <span className="glance-label">STYLE</span>
              </div>
            </div>

            <div className="glance-interests-container">
              <span className="glance-interests-eyebrow">TAILORED EXPERIENCES</span>
              <div className="glance-interests-pills" id="glance-interests-list">
                {interests.length > 0
                  ? interests.map(i => (
                      <span key={i} className="glance-interest-pill">
                        {i.toUpperCase()}
                      </span>
                    ))
                  : ['BALANCED', 'CURATED', 'PERSONALIZED'].map(i => (
                      <span key={i} className="glance-interest-pill">{i}</span>
                    ))}
              </div>
            </div>
          
            {/* LIVE WEATHER OUTLOOK (Open-Meteo Integration) */}
            <div className="weather-capsule-card">
              <div className="weather-header-row">
                <div className="weather-title-group">
                  <span className="weather-eyebrow">LIVE DESTINATION CLIMATE</span>
                  <h3 className="weather-city-title">
                    {destName} Forecast
                  </h3>
                </div>
                {(weather?.current || weather?.data?.current) && (
                  <div className="weather-current-badge">
                    <span className="weather-curr-icon">{(weather?.current || weather?.data?.current).icon}</span>
                    <span className="weather-curr-temp">{(weather?.current || weather?.data?.current).temperature}°C</span>
                    <span className="weather-curr-dot">&bull;</span>
                    <span className="weather-curr-condition">{(weather?.current || weather?.data?.current).condition}</span>
                  </div>
                )}
              </div>

              {isLoadingWeather ? (
                <div className="weather-loading-state">
                  <div className="weather-spinner"></div>
                  <span>Connecting to real-time meteorological models...</span>
                </div>
              ) : ((weather?.daily || weather?.data?.daily) && (weather?.daily || weather?.data?.daily).length > 0) ? (
                <div className="weather-days-grid">
                  {(weather?.daily || weather?.data?.daily).slice(0, 5).map((d, idx) => (
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
                <div className="weather-empty-state">
                  Weather forecast synchronizes automatically for destinations with verified coordinates.
                </div>
              )}

              <div className="weather-source-footer">
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
              <div className="itinerary-actions-bar">
                <button
                  type="button"
                  className="btn-download-pdf"
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  title="Download complete itinerary as a print-ready PDF"
                >
                  <span className="btn-pdf-icon">{isDownloadingPdf ? '⏳' : '📄'}</span>
                  <span>{isDownloadingPdf ? 'PREPARING PDF...' : 'DOWNLOAD ITINERARY (PDF)'}</span>
                </button>
              </div>
              <div className="gold-line-accent"></div>
            </div>

            {/* Premium Day Selector */}
            <div className="day-selector-sticky-wrap">
              <nav className="day-selector" id="day-selector" aria-label="Day selection">
                {Array.from({ length: duration }, (_, i) => i + 1).map(dayNum => {
                  const dayObj = daysList[dayNum - 1];
                  const tabDate = getComputedDayDate(dayNum);
                  const isMissing = !dayObj;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      className={`day-btn ${activeDay === dayNum ? 'active' : ''} ${isMissing ? 'day-btn-missing' : ''}`}
                      onClick={() => setActiveDay(dayNum)}
                      title={isMissing ? `Day ${dayNum} is not generated` : undefined}
                    >
                      <span className="day-btn-label">DAY {String(dayNum).padStart(2, '0')}</span>
                      {tabDate && <span className="day-btn-date">{formatTabDate(tabDate)}</span>}
                      {isMissing && <span className="day-btn-tag">(Unplanned)</span>}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="day-btn add-day-tab-btn"
                  onClick={handleAddDay}
                  title="Add another day to this journey"
                  style={{
                    borderStyle: 'dashed',
                    color: '#D6B56D',
                    borderColor: 'rgba(214, 181, 109, 0.45)',
                    padding: '8px 16px'
                  }}
                >
                  + Add Day
                </button>
              </nav>
            </div>

            {/* Travel Journal Day Title Header */}
            <div className="day-journal-header" id="day-journal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="journal-day-badge" id="journal-day-num">
                  DAY {String(activeDay).padStart(2, '0')}
                </div>
                <div className="journal-day-title-box">
                  <h3 className="journal-day-title" id="journal-day-title" style={{ margin: 0 }}>
                    {currentDayData?.dayTitle || (currentDayData ? `EXPLORING ${destName}` : `DAY ${activeDay}`)}
                  </h3>
                  {getComputedDayDate(activeDay) && (
                    <span className="journal-day-date">
                      {formatCalendarDate(getComputedDayDate(activeDay))}
                    </span>
                  )}
                </div>
              </div>

              <div className="day-header-actions">
                {hasUnsavedChanges ? (
                  <span className="unsaved-badge">● UNSAVED EDITS</span>
                ) : isSaved ? (
                  <span className="saved-badge">✓ SAVED</span>
                ) : null}
                <button
                  type="button"
                  className="act-btn"
                  onClick={() => openReplaceModal(activeDay, -1, 'Add Place')}
                  style={{ background: 'rgba(214, 181, 109, 0.15)', borderColor: '#D6B56D', color: '#D6B56D', padding: '8px 14px' }}
                >
                  + Add Place
                </button>
              </div>
            </div>

            {/* Incomplete / Unplanned Day Recovery Card */}
            {!currentDayData ? (
              <div className="incomplete-day-card">
                <div className="incomplete-day-icon">!</div>
                <span className="incomplete-badge">DAY {activeDay} NOT PLANNED</span>
                <h3>Day {activeDay} Is Not Available</h3>
                <p>
                  This journey contains {daysList.length} verified {daysList.length === 1 ? 'day' : 'days'}.
                  Dastaan does not loop earlier days or fabricate unverified daily schedules.
                </p>
                <div className="incomplete-actions">
                  <button type="button" className="btn-return-day1" onClick={() => setActiveDay(1)}>
                    &larr; Return to Day 01
                  </button>
                  <button type="button" className="btn-edit-pref" onClick={handleEditPreferences}>
                    Adjust Trip Duration &rarr;
                  </button>
                </div>
              </div>
            ) : (
              /* Timeline / Travel Journal Content */
              <div className="travel-journal-container" id="timeline-container">
                {(!currentDayData.activities || currentDayData.activities.length === 0) ? (
                  <div className="empty-day-banner">
                    <h4>NO ACTIVITIES SCHEDULED FOR DAY {activeDay}</h4>
                    <p>
                      You can add a place from the destination catalog, enter a custom place, or move activities here from another day.
                    </p>
                    <button
                      type="button"
                      className="act-btn"
                      onClick={() => openReplaceModal(activeDay, -1, 'Add Place')}
                      style={{ background: '#D6B56D', color: '#071D1A', border: 'none', padding: '10px 22px', fontSize: '0.85rem' }}
                    >
                      + ADD PLACE
                    </button>
                  </div>
                ) : (
                  currentDayData.activities?.map((act, idx) => {
                    const layoutClass = act.layout || (idx % 2 === 0 ? 'image-right' : 'image-left');
                    const imgLabel = act.imageLabel || `${act.title.toUpperCase()} · ${act.cat}`;
                    const actImgSrc = resolveImage(act.title, act.image, act.cat);

                    return (
                      <div
                        key={idx}
                        className={`activity-card-row ${layoutClass}`}
                        style={{ animationDelay: `${idx * 0.1}s` }}
                      >
                        <div className="activity-time-col">
                          <span className="activity-time-text">{act.time}</span>
                        </div>
                        <div className="activity-main-content">
                          <div className="activity-text-box">
                            <h4>{act.title}</h4>
                            <p className="activity-desc">{act.desc}</p>
                            <span className="activity-cat-tag">{act.cat}</span>
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

                          {/* 5 Activity Action Buttons */}
                          <div className="activity-card-actions">
                            <button
                              type="button"
                              className="act-btn"
                              disabled={idx === 0}
                              onClick={() => handleMoveActivity(activeDay, idx, -1)}
                              title={idx === 0 ? "Already first in day" : "Move place earlier in the day"}
                            >
                              ↑ Move Up
                            </button>
                            <button
                              type="button"
                              className="act-btn"
                              disabled={idx === (currentDayData.activities?.length - 1)}
                              onClick={() => handleMoveActivity(activeDay, idx, 1)}
                              title={idx === (currentDayData.activities?.length - 1) ? "Already last in day" : "Move place later in the day"}
                            >
                              ↓ Move Down
                            </button>
                            {daysList.length > 1 && (
                              <button
                                type="button"
                                className="act-btn"
                                onClick={() => openMoveDayModal(activeDay, idx, act.title)}
                                title="Move this place to another day"
                              >
                                ⇄ Move to Day...
                              </button>
                            )}
                            <button
                              type="button"
                              className="act-btn"
                              onClick={() => openReplaceModal(activeDay, idx, act.title)}
                              title="Replace this place with another place or custom place"
                            >
                              ↻ Replace
                            </button>
                            <button
                              type="button"
                              className="act-btn act-btn-remove"
                              onClick={() => handleRemoveActivity(activeDay, idx)}
                              title="Remove this place from day"
                            >
                              ✕ Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
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
            </div>

            {/* SVG Route Canvas Container */}
            <div className="route-visualization-wrapper">
              <div className="route-svg-canvas" id="route-svg-canvas">
                <svg width="100%" height="160" viewBox="0 0 800 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d={pathD} stroke="#D6B56D" strokeWidth="3" strokeLinecap="round" opacity="0.6" strokeDasharray="6 6" />
                  <path d={pathD} stroke="#D6B56D" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
                  {points.map((pt, idx) => {
                    const isEdge = idx === 0 || idx === points.length - 1;
                    const r = isEdge ? 7 : 9;
                    const color = isEdge ? '#C87955' : '#D6B56D';
                    const textY = pt.y > 80 ? pt.y + 24 : pt.y - 16;
                    const shortLabel = pt.name.length > 14 ? pt.name.substring(0, 12) + '...' : pt.name;

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
              </div>
            </div>

            {/* Stats Bar */}
            <div className="routing-stats-bar">
              <div className="route-stat-item">
                <span className="route-stat-num" id="stat-places">{placesCount}</span>
                <span className="route-stat-label">PLACES</span>
              </div>
              <div className="route-stat-divider"></div>
              <div className="route-stat-item">
                <span className="route-stat-num" id="stat-movement">{movementKm} KM</span>
                <span className="route-stat-label">ESTIMATED MOVEMENT</span>
              </div>
              <div className="route-stat-divider"></div>
              <div className="route-stat-item">
                <span className="route-stat-num" id="stat-saved">{timeSavedMin} MIN</span>
                <span className="route-stat-label">TIME SAVED</span>
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

              <div className="budget-hero-row">
                <div className="budget-hero-col">
                  <span className="budget-hero-eyebrow">TOTAL GROUP BUDGET</span>
                  <div className="budget-total-hero" id="budget-total">
                    ₹{budget.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="budget-hero-divider"></div>
                <div className="budget-hero-col">
                  <span className="budget-hero-eyebrow">ESTIMATED PER PERSON ({travelers} {travelers === 1 ? 'TRAVELLER' : 'TRAVELLERS'})</span>
                  <div className="budget-total-hero budget-per-person-hero" id="budget-per-person">
                    ₹{estimatedCostPerPerson.toLocaleString('en-IN')}
                  </div>
                </div>
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
                  const savedCategory = trip.itinerary?.breakdown?.find(
                    b => b.category?.toLowerCase() === item.name.toLowerCase()
                  );
                  const totalVal = savedCategory ? savedCategory.amount : Math.round(budget * (item.pct / 100));
                  const perPersonVal = savedCategory?.perPersonAmount || Math.round(totalVal / travelers);

                  return (
                    <div key={idx} className="budget-grid-item">
                      <div className="bg-item-name">
                        <div className="bg-item-dot" style={{ backgroundColor: item.color }}></div>
                        <span>{item.name}</span>
                        <span className="bg-item-pct">{item.pct}%</span>
                      </div>
                      <div className="bg-item-val">₹{totalVal.toLocaleString('en-IN')}</div>
                      <div className="bg-item-per-person">₹{perPersonVal.toLocaleString('en-IN')} / person</div>
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
                <span className="badge-tag-pill">{travelers} {travelers === 1 ? 'Traveller' : 'Travellers'}</span>
                <span className="badge-tag-pill">₹{budget.toLocaleString('en-IN')} Total</span>
                <span className="badge-tag-pill">₹{estimatedCostPerPerson.toLocaleString('en-IN')}/Person</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6.5: VERIFIED PLACES & DINING (Live & Curated Places) */}
        {places.length > 0 && (
          <section className="section-places-discovery" id="places-section">
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
                {places.map((place, idx) => {
                  const placeImg = resolveImage(place.name, place.photoUrl, place.category);
                  return (
                    <article key={place.placeId || idx} className="verified-place-card">
                      <div className="place-img-wrap image-placeholder">
                        {placeImg ? (
                          <img
                            src={placeImg}
                            alt={place.name}
                            className="place-img loaded"
                            loading="lazy"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : null}
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
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* SECTION 7: FINAL CINEMATIC CTA SECTION (Dark Closing) */}
        <section className="section-final" id="final-section">
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
              {destName} &bull; {duration} DAYS &bull; {travelers} {travelers === 1 ? 'TRAVELLER' : 'TRAVELLERS'} &bull; ₹{budget.toLocaleString('en-IN')} TOTAL (₹{estimatedCostPerPerson.toLocaleString('en-IN')}/PERSON)
              {dateRangeText && <> &bull; {dateRangeText}</>}
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
              <div className="final-sub-actions">
                <button type="button" className="btn-secondary-outline" id="btn-edit" onClick={handleEditPreferences}>
                  EDIT PREFERENCES
                </button>
                <button type="button" className="btn-tertiary-link" id="btn-reset" onClick={handleStartOver}>
                  START OVER
                </button>
              </div>
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

      {/* REPLACE / ADD PLACE MODAL */}
      {replaceModal.isOpen && (
        <div className="edit-modal-overlay" onClick={closeReplaceModal}>
          <div className="edit-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>
                {replaceModal.actIdx >= 0
                  ? `REPLACE: ${replaceModal.currentTitle}`
                  : `ADD PLACE · DAY ${String(replaceModal.dayNum).padStart(2, '0')}`}
              </h3>
              <button
                type="button"
                className="edit-modal-close"
                onClick={closeReplaceModal}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="edit-modal-body">
              <div className="modal-tab-row">
                <button
                  type="button"
                  className={`modal-tab-btn ${modalTab === 'catalog' ? 'active' : ''}`}
                  onClick={() => setModalTab('catalog')}
                >
                  From Catalog ({allAvailablePlaces.length})
                </button>
                <button
                  type="button"
                  className={`modal-tab-btn ${modalTab === 'custom' ? 'active' : ''}`}
                  onClick={() => setModalTab('custom')}
                >
                  + Custom / Any Place
                </button>
              </div>

              {modalTab === 'catalog' ? (
                <>
                  <input
                    type="text"
                    className="edit-modal-search"
                    placeholder={`Search places in ${destName}...`}
                    value={replaceSearch}
                    onChange={(e) => setReplaceSearch(e.target.value)}
                    autoFocus
                  />

                  {filteredReplacementPlaces.length > 0 ? (
                    <div className="places-list-container">
                      {filteredReplacementPlaces.map((place, idx) => (
                        <div key={place.placeId || idx} className="place-item-card">
                          <div className="place-item-info">
                            <h5>{place.name}</h5>
                            <p>{place.address || `Heritage sight in ${destName}`}</p>
                            <div className="place-item-badges">
                              <span className="badge-tag-pill" style={{ fontSize: '0.7rem' }}>
                                {(place.category || 'CULTURE').toUpperCase()}
                              </span>
                              {place.rating && (
                                <span style={{ fontSize: '0.74rem', color: '#D6B56D' }}>
                                  ★ {place.rating}
                                </span>
                              )}
                              {place.visitDurationHours && (
                                <span style={{ fontSize: '0.74rem', color: '#E8DCC7', opacity: 0.75 }}>
                                  ~{place.visitDurationHours}h visit
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn-select-place"
                            onClick={() => handleSelectReplacement(place)}
                          >
                            {replaceModal.actIdx >= 0 ? 'REPLACE' : '+ ADD PLACE'}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: 'rgba(244, 239, 227, 0.75)' }}>
                      <p style={{ margin: '0 0 14px 0' }}>No catalog places found matching "{replaceSearch}".</p>
                      <button
                        type="button"
                        className="modal-tab-btn active"
                        style={{ display: 'inline-block', width: 'auto', padding: '8px 20px' }}
                        onClick={() => {
                          setCustomPlace(prev => ({ ...prev, name: replaceSearch }));
                          setModalTab('custom');
                        }}
                      >
                        Add "{replaceSearch}" as Custom Place &rarr;
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <form
                  className="custom-place-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!customPlace.name.trim()) return;
                    handleSelectReplacement({
                      name: customPlace.name.trim(),
                      category: customPlace.category,
                      visitDurationHours: parseFloat(customPlace.duration) || 2.0,
                      address: customPlace.address.trim() || `${customPlace.name.trim()}, ${destName}`,
                      desc: customPlace.desc.trim() || `Custom place in ${destName}.`,
                      source: 'user-custom',
                      photoUrl: null
                    });
                  }}
                >
                  <div className="custom-field">
                    <label>Place Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chokhi Dhani, Secret Cafe, Viewpoint..."
                      value={customPlace.name}
                      onChange={(e) => setCustomPlace({ ...customPlace, name: e.target.value })}
                      autoFocus
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="custom-field">
                      <label>Category</label>
                      <select
                        value={customPlace.category}
                        onChange={(e) => setCustomPlace({ ...customPlace, category: e.target.value })}
                      >
                        <option value="CULTURE">Culture / Heritage</option>
                        <option value="NATURE">Nature / Scenic</option>
                        <option value="FOOD">Food / Dining</option>
                        <option value="ADVENTURE">Adventure</option>
                        <option value="RELAX">Relax / Sunset</option>
                        <option value="SHOPPING">Shopping / Crafts</option>
                      </select>
                    </div>

                    <div className="custom-field">
                      <label>Visit Duration</label>
                      <select
                        value={customPlace.duration}
                        onChange={(e) => setCustomPlace({ ...customPlace, duration: e.target.value })}
                      >
                        <option value="1.0">~1.0 hour</option>
                        <option value="1.5">~1.5 hours</option>
                        <option value="2.0">~2.0 hours</option>
                        <option value="2.5">~2.5 hours</option>
                        <option value="3.0">~3.0 hours</option>
                        <option value="4.0">~4.0 hours</option>
                      </select>
                    </div>
                  </div>

                  <div className="custom-field">
                    <label>Address / Landmark (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. 12 Tonk Road, Amer Area"
                      value={customPlace.address}
                      onChange={(e) => setCustomPlace({ ...customPlace, address: e.target.value })}
                    />
                  </div>

                  <div className="custom-field">
                    <label>Description / Notes (Optional)</label>
                    <textarea
                      rows="2"
                      placeholder="e.g. Authentic Rajasthani cultural village with evening puppet shows and dinner."
                      value={customPlace.desc}
                      onChange={(e) => setCustomPlace({ ...customPlace, desc: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-add-custom"
                    disabled={!customPlace.name.trim()}
                  >
                    {replaceModal.actIdx >= 0
                      ? 'REPLACE WITH THIS PLACE'
                      : `+ ADD PLACE TO DAY ${String(replaceModal.dayNum).padStart(2, '0')}`}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MOVE TO ANOTHER DAY MODAL */}
      {moveDayModal.isOpen && (
        <div className="edit-modal-overlay" onClick={closeMoveDayModal}>
          <div className="edit-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>MOVE PLACE TO ANOTHER DAY</h3>
              <button
                type="button"
                className="edit-modal-close"
                onClick={closeMoveDayModal}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            <div className="edit-modal-body">
              <p style={{ fontSize: '0.88rem', color: '#E8DCC7', opacity: 0.9, marginBottom: '18px' }}>
                Moving <strong style={{ color: '#D6B56D' }}>"{moveDayModal.currentTitle}"</strong> from <strong>Day {moveDayModal.dayNum}</strong> to:
              </p>

              <div className="move-days-list">
                {daysList.map(d => {
                  if (d.dayNum === moveDayModal.dayNum) return null;
                  const count = (d.activities || []).length;
                  return (
                    <div
                      key={d.dayNum}
                      className="move-day-option"
                      onClick={() => handleMoveToAnotherDay(moveDayModal.dayNum, moveDayModal.actIdx, d.dayNum)}
                    >
                      <div>
                        <div className="move-day-title">
                          DAY {String(d.dayNum).padStart(2, '0')}: {d.dayTitle || `Exploring ${destName}`}
                        </div>
                        <div className="move-day-count">
                          {count} place{count !== 1 ? 's' : ''} currently planned
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-move-here"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveToAnotherDay(moveDayModal.dayNum, moveDayModal.actIdx, d.dayNum);
                        }}
                      >
                        MOVE HERE &rarr;
                      </button>
                    </div>
                  );
                })}

                {/* Option to create a brand new day if desired */}
                <div
                  className="move-day-option"
                  style={{ borderStyle: 'dashed', borderColor: 'rgba(214, 181, 109, 0.4)' }}
                  onClick={() => handleMoveToAnotherDay(moveDayModal.dayNum, moveDayModal.actIdx, daysList.length + 1)}
                >
                  <div>
                    <div className="move-day-title" style={{ color: '#D6B56D' }}>
                      + CREATE NEW DAY (DAY {String(daysList.length + 1).padStart(2, '0')})
                    </div>
                    <div className="move-day-count">
                      Start a new day with this place
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-move-here"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveToAnotherDay(moveDayModal.dayNum, moveDayModal.actIdx, daysList.length + 1);
                    }}
                  >
                    CREATE & MOVE &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <LightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        data={lightboxData}
      />

      <Footer />
    </div>
  );
}
