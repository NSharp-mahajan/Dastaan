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

  // Tooltip state for budget bar
  const [budgetTooltip, setBudgetTooltip] = useState({ text: '', x: 0, visible: false });

  // Lightbox state
  const [lightboxData, setLightboxData] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const budgetBarRef = useRef(null);

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
            setTrip(parsed);
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

  // Days list calculation: prefer database-stored days if present
  const daysList = (trip.itinerary?.days && trip.itinerary.days.length > 0)
    ? trip.itinerary.days
    : data.days;
  const currentDayData = daysList[(activeDay - 1) % daysList.length];

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

  // Route statistics
  const multiplier = travelStyle === 'Packed' ? 1.4 : travelStyle === 'Relaxed' ? 0.7 : 1;
  const placesCount = Math.round((currentDayData.activities?.length || 3) * duration);
  const movementKm = Math.round(3.2 * multiplier * duration);
  const timeSavedMin = Math.round(45 * multiplier);

  // Route SVG nodes
  const nodeNames = ['START', ...(currentDayData.activities || []).map(a => a.title), 'END'];
  const nodeCount = nodeNames.length;
  const startX = 60;
  const endX = 740;
  const step = (endX - startX) / Math.max(1, nodeCount - 1);

  const points = [];
  let pathD = `M ${startX} 80`;

  for (let i = 0; i < nodeCount; i++) {
    const x = startX + i * step;
    const y = 80 + (i % 2 === 1 ? -25 : 25);
    points.push({ x, y, name: nodeNames[i] });
    if (i > 0) {
      const prev = points[i - 1];
      const cx1 = prev.x + step / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + step / 2;
      const cy2 = y;
      pathD += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x} ${y}`;
    }
  }

  // Budget calculations
  const breakdown = [
    { name: 'Accommodation', pct: 40, color: '#D6B56D' },
    { name: 'Food', pct: 25, color: '#C87955' },
    { name: 'Transport', pct: 15, color: '#7F9087' },
    { name: 'Activities', pct: 15, color: '#F4EFE3' },
    { name: 'Buffer', pct: 5, color: 'rgba(214, 181, 109, 0.35)' }
  ];

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

            {/* Travel Journal Day Title Header */}
            <div className="day-journal-header" id="day-journal-header">
              <div className="journal-day-badge" id="journal-day-num">
                DAY {String(activeDay).padStart(2, '0')}
              </div>
              <h3 className="journal-day-title" id="journal-day-title">
                {currentDayData.dayTitle || `EXPLORING ${destName}`}
              </h3>
            </div>

            {/* Timeline / Travel Journal Content */}
            <div className="travel-journal-container" id="timeline-container">
              {currentDayData.activities?.map((act, idx) => {
                const layoutClass = act.layout || (idx % 2 === 0 ? 'image-right' : 'image-left');
                const imgLabel = act.imageLabel || `${act.title.toUpperCase()} \u00B7 ${act.cat}`;
                const actImgSrc = resolveImage(act.title, act.image);

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
                    </div>
                  </div>
                );
              })}
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
                <span>{isSaving ? 'SAVING JOURNEY...' : isSaved ? '\u2713 JOURNEY SAVED' : 'SAVE MY JOURNEY \u2192'}</span>
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
