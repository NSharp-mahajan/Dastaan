import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { plannerDestinations } from '../data/destinations';
import { availableInterests } from '../data/interests';
import apiClient from '../services/api';
import { auth } from '../firebase';
import '../styles/navigation.css';
import '../styles/page2.css';

export default function TripConfiguratorPage() {
  const navigate = useNavigate();

  // Load existing state from localStorage if available
  const [selectedDest, setSelectedDest] = useState(null);
  const [duration, setDuration] = useState(3);
  const [budget, setBudget] = useState(8000);
  const [interests, setInterests] = useState([]);
  const [travelStyle, setTravelStyle] = useState('Balanced');
  const [searchVal, setSearchVal] = useState('');
  const [bgImage, setBgImage] = useState('https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1800&q=80');
  const [bgOpacity, setBgOpacity] = useState(1);
  const [validationMsg, setValidationMsg] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('dastaanTrip');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.destination) {
          setSelectedDest(parsed.destination);
          setSearchVal(parsed.destination.name || '');
          if (parsed.destination.image) {
            setBgImage(parsed.destination.image);
          }
        }
        if (parsed.duration) setDuration(parsed.duration);
        if (parsed.budget) setBudget(parsed.budget);
        if (Array.isArray(parsed.interests)) setInterests(parsed.interests);
        if (parsed.travelStyle) setTravelStyle(parsed.travelStyle);
      } catch (e) {
        console.error('Error loading dastaanTrip', e);
      }
    }
  }, []);


  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Save changes to localStorage
  const saveState = (updated) => {
    const current = {
      destination: selectedDest,
      duration,
      budget,
      interests,
      travelStyle,
      ...updated
    };
    localStorage.setItem('dastaanTrip', JSON.stringify(current));
  };

  const handleSelectDest = (dest) => {
    setSelectedDest(dest);
    setSearchVal(dest.name);
    setValidationMsg('');
    setIsDropdownOpen(false);
    if (dest.defaultDur) setDuration(dest.defaultDur);
    if (dest.defaultBud) setBudget(dest.defaultBud);
    if (dest.image) setBgImage(dest.image);
    saveState({ destination: dest });
  };

  const handleSearchInput = (val) => {
    setSearchVal(val);
    setValidationMsg('');

    if (!val || val.trim().length < 2) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      setIsSearching(false);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      return;
    }

    setIsSearching(true);
    setIsDropdownOpen(true);
    setSearchError('');

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await apiClient.searchDestinations(val.trim());
        if (res.success && Array.isArray(res.data?.data)) {
          setSuggestions(res.data.data);
          setIsDropdownOpen(true);
        } else {
          setSuggestions([]);
          if (res.error) setSearchError(res.error);
        }
      } catch (err) {
        setSuggestions([]);
        setSearchError('Unable to connect to destination service.');
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleDurationChange = (val) => {
    let num = parseInt(val);
    if (isNaN(num) || num < 1) num = 1;
    if (num > 60) num = 60;
    setDuration(num);
    saveState({ duration: num });
  };

  const handleBudgetChange = (val) => {
    let num = parseInt(val) || 0;
    if (num < 1000) num = 1000;
    setBudget(num);
    saveState({ budget: num });
  };

  const toggleInterest = (interest) => {
    let updated;
    if (interests.includes(interest)) {
      updated = interests.filter(i => i !== interest);
    } else {
      updated = [...interests, interest];
    }
    setInterests(updated);
    saveState({ interests: updated });
  };

  const handleStyleChange = (style) => {
    setTravelStyle(style);
    saveState({ travelStyle: style });
  };

  const handleBuild = async () => {
    let destToUse = selectedDest;

    // Guard against mismatch: user typed destination without clicking dropdown suggestion
    if (!destToUse || (searchVal.trim() && destToUse.name.toLowerCase() !== searchVal.trim().toLowerCase())) {
      if (!searchVal.trim()) {
        setValidationMsg('Please select a destination to continue.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setIsBuilding(true);
      try {
        const searchRes = await apiClient.searchDestinations(searchVal.trim());
        if (searchRes.success && Array.isArray(searchRes.data?.data) && searchRes.data.data.length > 0) {
          destToUse = searchRes.data.data[0];
          setSelectedDest(destToUse);
          saveState({ destination: destToUse });
        } else {
          setIsBuilding(false);
          setValidationMsg(`Could not find a destination matching "${searchVal}". Please choose a valid city or destination.`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      } catch (e) {
        setIsBuilding(false);
        setValidationMsg(`Failed to look up "${searchVal}". Please check your connection and try again.`);
        return;
      }
    }

    if (!destToUse) {
      setValidationMsg('Please select a destination to continue.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setValidationMsg('');
    setIsBuilding(true);

    const tripPayload = {
      destination: destToUse,
      duration,
      budget,
      interests,
      travelStyle
    };

    try {
      // 1. Generate full intelligent preview with feasibility, ordering & routing
      const previewRes = await apiClient.previewTrip(tripPayload);

      if (!previewRes.success || !previewRes.data?.data) {
        throw new Error(previewRes.error || 'Failed to generate itinerary. Please try again.');
      }

      const generatedTrip = previewRes.data.data;
      // Guarantee no stale trip from previous destinations remains
      localStorage.removeItem('dastaanTrip');
      localStorage.setItem('dastaanTrip', JSON.stringify(generatedTrip));

      // 2. If user is authenticated, persist to MongoDB Atlas
      if (auth.currentUser) {
        try {
          const saveRes = await apiClient.createTrip(generatedTrip);
          if (saveRes.success && saveRes.data?.data) {
            const savedDoc = saveRes.data.data;
            localStorage.setItem('dastaanTrip', JSON.stringify(savedDoc));
            navigate(`/itinerary?id=${savedDoc._id}`);
            return;
          }
        } catch (saveErr) {
          console.warn('[TripPlanner] Authenticated save deferred, navigating with preview:', saveErr);
        }
      }

      // 3. Guest user: Navigate to itinerary with full generated preview
      navigate('/itinerary');
    } catch (err) {
      console.error('[TripPlanner] Itinerary generation failed:', err);
      setValidationMsg(err.message || 'Unable to build itinerary. Please check your connection and try again.');
      setIsBuilding(false);
    }
  };

  return (
    <div className="trip-configurator-page">
      <Navbar isFixed={false} />

      {/* SECTION 1: HERO / INTRO */}
      <section className="section-hero">
        <div className="container">
          <div className="stepper">
            <span className="step active">01 TELL US</span>
            <span className="step-divider"></span>
            <span className="step">02 WE PLAN</span>
            <span className="step-divider"></span>
            <span className="step">03 YOU TRAVEL</span>
          </div>

          <div className="hero-content">
            <span className="eyebrow">CHAPTER 01 &middot; TELL US</span>
            <h1>LET'S BEGIN YOUR JOURNEY</h1>
            <p>Tell us what makes a trip yours.</p>
          </div>
        </div>
      </section>

      {/* SECTION 2: DESTINATION */}
      <section className="section-destination">
        <div className="destination-bg" id="dest-bg-container">
          <img
            id="dest-bg-image"
            src={bgImage}
            alt="Destination Background"
            style={{ opacity: bgOpacity, transition: 'opacity 0.4s ease' }}
          />
          <div className="dest-overlay"></div>
        </div>

        <div className="container dest-container">
          <div className="dest-search-area">
            <h2>WHERE WILL YOUR STORY TAKE YOU?</h2>

            <div className="search-box" ref={searchContainerRef}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                id="dest-search"
                placeholder="Search for any city worldwide (e.g. Vancouver, Kyoto, Paris)..."
                autoComplete="off"
                value={searchVal}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0 || searchVal.trim().length >= 2) {
                    setIsDropdownOpen(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (isDropdownOpen && suggestions.length > 0) {
                      handleSelectDest(suggestions[0]);
                    }
                  } else if (e.key === 'Escape') {
                    setIsDropdownOpen(false);
                  }
                }}
              />
              {isSearching && (
                <div className="search-box-spinner">
                  <div className="spinner-dot"></div>
                </div>
              )}

              {isDropdownOpen && (
                <ul className="dest-autocomplete-dropdown">
                  {suggestions.map((item) => (
                    <li
                      key={item.id}
                      className={`dest-autocomplete-item ${selectedDest?.id === item.id ? 'selected' : ''}`}
                      onClick={() => handleSelectDest(item)}
                    >
                      <div className="dest-item-main">
                        <span className="dest-item-name">{item.name}</span>
                        <span className="dest-item-context">
                          {[item.admin1, item.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                      <span className="dest-item-badge">
                        {item.countryCode || (item.source === 'curated-popular' ? 'CURATED' : 'GLOBAL')}
                      </span>
                    </li>
                  ))}

                  {suggestions.length === 0 && !isSearching && searchVal.trim().length >= 2 && (
                    <li className="dest-autocomplete-status">
                      No destinations found matching "{searchVal}". Try another city name.
                    </li>
                  )}
                  {searchError && (
                    <li className="dest-autocomplete-status" style={{ color: '#E06C75' }}>
                      {searchError}
                    </li>
                  )}
                </ul>
              )}
            </div>

            <div className="popular-dests">
              <span className="popular-label">POPULAR DESTINATIONS</span>
              <div className="dest-tags" id="dest-tags">
                {plannerDestinations.map(dest => (
                  <button
                    key={dest.id}
                    type="button"
                    className={`dest-tag ${selectedDest?.id === dest.id ? 'active' : ''}`}
                    onClick={() => handleSelectDest(dest)}
                  >
                    {dest.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="dest-preview-card" id="dest-preview">
            <h3 id="preview-name">{selectedDest ? selectedDest.name : 'Select a destination'}</h3>
            <p id="preview-country">{selectedDest ? selectedDest.country : 'To begin your story'}</p>
            {selectedDest && (
              <div className="preview-meta" id="preview-meta" style={{ display: 'block' }}>
                <span id="preview-duration">~{selectedDest.defaultDur} days</span> &middot;{' '}
                <span id="preview-budget">~₹{selectedDest.defaultBud?.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 3: YOUR JOURNEY (Light Break) */}
      <section className="section-journey">
        <div className="container">
          <div className="section-header dark">
            <h2>TELL US ABOUT THE JOURNEY.</h2>
          </div>

          <div className="journey-grid">
            {/* Duration */}
            <div className="journey-col duration-col">
              <span className="col-label">HOW MANY DAYS?</span>
              <div className="duration-control">
                <button type="button" id="btn-dur-minus" aria-label="Decrease days" onClick={() => handleDurationChange(duration - 1)}>
                  −
                </button>
                <div className="duration-display">
                  <span id="dur-val">{duration}</span>
                  <span className="dur-unit">DAYS</span>
                </div>
                <button type="button" id="btn-dur-plus" aria-label="Increase days" onClick={() => handleDurationChange(duration + 1)}>
                  +
                </button>
              </div>

              <div className="preset-pills">
                {[3, 7, 10, 14].map(d => (
                  <button
                    key={d}
                    type="button"
                    className={`preset-pill ${duration === d ? 'active' : ''}`}
                    onClick={() => handleDurationChange(d)}
                  >
                    {d === 3 ? 'Weekend (3)' : d === 7 ? 'Standard (7)' : d === 10 ? 'Full Week (10)' : 'Fortnight (14)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="journey-divider"></div>

            {/* Budget */}
            <div className="journey-col budget-col">
              <span className="col-label">WHAT'S YOUR BUDGET?</span>
              <div className="budget-input-wrapper">
                <span className="currency-symbol">₹</span>
                <input
                  type="number"
                  id="budget-input"
                  value={budget}
                  min="1000"
                  step="1000"
                  onChange={(e) => handleBudgetChange(e.target.value)}
                />
              </div>

              <div className="preset-pills">
                {[5000, 8000, 15000, 30000, 50000].map(b => (
                  <button
                    key={b}
                    type="button"
                    className={`preset-pill ${budget === b ? 'active' : ''}`}
                    onClick={() => handleBudgetChange(b)}
                  >
                    ₹{b.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: INTERESTS */}
      <section className="section-interests">
        <div className="container">
          <div className="section-header">
            <h2>WHAT MAKES A PERFECT TRIP FOR YOU?</h2>
            <div className="header-sub">
              <p>Choose what you want to experience.</p>
              <span className="selection-count" id="interests-count">
                {interests.length} SELECTED
              </span>
            </div>
          </div>

          <div className="interests-grid" id="interests-grid">
            {availableInterests.map(interest => {
              const isSelected = interests.includes(interest);
              return (
                <div
                  key={interest}
                  className={`interest-tile ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleInterest(interest)}
                >
                  <span>{interest}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 5: TRAVEL STYLE */}
      <section className="section-style">
        <div className="container">
          <div className="section-header">
            <h2>HOW DO YOU LIKE TO TRAVEL?</h2>
          </div>

          <div className="style-cards" id="style-cards">
            <div
              className={`style-card ${travelStyle === 'Relaxed' ? 'active' : ''}`}
              onClick={() => handleStyleChange('Relaxed')}
            >
              <h3>RELAXED</h3>
              <p>"Slow mornings, fewer stops, more time to explore."</p>
              <span className="style-meta">2–3 sights/day</span>
            </div>
            <div
              className={`style-card ${travelStyle === 'Balanced' ? 'active' : ''}`}
              onClick={() => handleStyleChange('Balanced')}
            >
              <h3>BALANCED</h3>
              <p>"See the best of the city without rushing."</p>
              <span className="style-meta">3–4 sights/day</span>
            </div>
            <div
              className={`style-card ${travelStyle === 'Packed' ? 'active' : ''}`}
              onClick={() => handleStyleChange('Packed')}
            >
              <h3>PACKED</h3>
              <p>"Make every moment count and see as much as possible."</p>
              <span className="style-meta">5+ sights/day</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6: LIVE SUMMARY */}
      <section className="section-summary">
        <div className="container">
          <div className="summary-box">
            <h2 className="summary-title">YOUR JOURNEY, SO FAR.</h2>

            <div className="summary-items">
              <div className="summary-item">
                <span className="sum-label">DESTINATION</span>
                <span className="sum-val" id="sum-dest">
                  {selectedDest ? `${selectedDest.name}, ${selectedDest.country}` : 'Not selected'}
                </span>
              </div>
              <div className="summary-item">
                <span className="sum-label">DURATION</span>
                <span className="sum-val" id="sum-dur">
                  {duration} Days
                </span>
              </div>
              <div className="summary-item">
                <span className="sum-label">BUDGET</span>
                <span className="sum-val" id="sum-budget">
                  ₹{budget.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="summary-item">
                <span className="sum-label">INTERESTS</span>
                <span className="sum-val" id="sum-interests">
                  {interests.length > 0 ? interests.join('  ') : 'None'}
                </span>
              </div>
              <div className="summary-item">
                <span className="sum-label">STYLE</span>
                <span className="sum-val" id="sum-style">
                  {travelStyle}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: FINAL CTA */}
      <section className="section-cta">
        <div className="container text-center">
          {validationMsg && <div className="validation-msg" id="validation-msg">{validationMsg}</div>}
          <button className="btn-build" id="btn-build" onClick={handleBuild} disabled={isBuilding}>
            {isBuilding ? 'BUILDING...' : 'BUILD MY ITINERARY \u2192'}
          </button>
          <p className="cta-sub">Your preferences will be used to create a personalized journey.</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
