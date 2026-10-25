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

  // Helper for today's date in YYYY-MM-DD (local time)
  const getTodayDateString = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Load existing state from localStorage if available
  const [selectedDest, setSelectedDest] = useState(null);
  const [duration, setDuration] = useState(3);
  const [travelers, setTravelers] = useState(1);
  const [startDate, setStartDate] = useState('');
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
        if (parsed.duration) setDuration(Math.max(1, Math.min(60, parseInt(parsed.duration, 10))));
        if (parsed.travelers) setTravelers(Math.max(1, Math.min(20, parseInt(parsed.travelers, 10))));
        if (parsed.startDate) {
          const rawDate = typeof parsed.startDate === 'string' ? parsed.startDate.split('T')[0] : '';
          const todayStr = getTodayDateString();
          if (rawDate && rawDate >= todayStr) {
            setStartDate(rawDate);
          }
        }
        if (parsed.budget) setBudget(Math.max(1000, parseInt(parsed.budget, 10)));
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
  const saveState = (updated = {}) => {
    const tripPayload = {
      destination: updated.selectedDest !== undefined ? updated.selectedDest : selectedDest,
      duration: updated.duration !== undefined ? updated.duration : duration,
      travelers: updated.travelers !== undefined ? updated.travelers : travelers,
      startDate: updated.startDate !== undefined ? updated.startDate : (startDate || null),
      budget: updated.budget !== undefined ? updated.budget : budget,
      interests: updated.interests !== undefined ? updated.interests : interests,
      travelStyle: updated.travelStyle !== undefined ? updated.travelStyle : travelStyle
    };
    localStorage.setItem('dastaanTrip', JSON.stringify(tripPayload));
  };

  const handleSelectDest = (dest) => {
    setSelectedDest(dest);
    setSearchVal(dest.name);
    setValidationMsg('');
    setIsDropdownOpen(false);
    if (dest.defaultDur) setDuration(dest.defaultDur);
    if (dest.defaultBud) setBudget(dest.defaultBud);

    // Crossfade background image
    setBgOpacity(0);
    setTimeout(() => {
      setBgImage(dest.image || 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1800&q=80');
      setBgOpacity(1);
    }, 400);

    saveState({ destination: dest, selectedDest: dest });
  };

  const handleSearchInput = (val) => {
    setSearchVal(val);
    setValidationMsg('');

    const trimmed = (val || '').trim();
    if (!trimmed) {
      setSelectedDest(null);
      setSuggestions([]);
      setIsDropdownOpen(false);
      setIsSearching(false);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      saveState({ destination: null, selectedDest: null });
      return;
    }

    // Immediately keep typed text available as open worldwide destination
    const foundCurated = plannerDestinations.find(
      d => d.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (foundCurated) {
      setSelectedDest(foundCurated);
      saveState({ destination: foundCurated, selectedDest: foundCurated });
    } else {
      const worldwideDest = {
        name: trimmed,
        country: 'Worldwide',
        id: trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        image: bgImage || 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1800&q=80'
      };
      setSelectedDest(worldwideDest);
      saveState({ destination: worldwideDest, selectedDest: worldwideDest });
    }

    if (trimmed.length < 2) {
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
        const res = await apiClient.searchDestinations(trimmed);
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
    let num = parseInt(val, 10);
    if (isNaN(num) || num < 1) num = 1;
    if (num > 60) num = 60;
    setDuration(num);
    saveState({ duration: num });
  };

  const handleTravelersChange = (val) => {
    let num = parseInt(val, 10);
    if (isNaN(num) || num < 1) num = 1;
    if (num > 20) num = 20;
    setTravelers(num);
    saveState({ travelers: num });
  };

  const handleStartDateChange = (val) => {
    if (!val) {
      setStartDate('');
      setValidationMsg('');
      saveState({ startDate: null });
      return;
    }

    const todayStr = getTodayDateString();
    if (val < todayStr) {
      setValidationMsg('Travel date cannot be in the past. Please choose today or an upcoming date.');
      return;
    }

    setValidationMsg('');
    setStartDate(val);
    saveState({ startDate: val });
  };

  const handleBudgetChange = (val) => {
    let num = parseInt(val, 10) || 0;
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

  const formatDateRangeDisplay = (startStr, dur) => {
    if (!startStr) return 'Flexible Dates';
    try {
      const start = new Date(startStr);
      if (isNaN(start.getTime())) return 'Flexible Dates';
      const end = new Date(start);
      end.setDate(end.getDate() + Math.max(0, dur - 1));
      const sDay = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const eDay = end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${sDay} – ${eDay}`;
    } catch {
      return 'Flexible Dates';
    }
  };

  const handleBuild = async () => {
    let destToUse = selectedDest;

    // Guard against mismatch: user typed destination without clicking dropdown suggestion
    if (!destToUse || (searchVal.trim() && destToUse.name.toLowerCase() !== searchVal.trim().toLowerCase())) {
      if (!searchVal.trim()) {
        setValidationMsg('Please enter or select a destination to continue.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setIsBuilding(true);
      try {
        const searchRes = await apiClient.searchDestinations(searchVal.trim());
        if (searchRes.success && Array.isArray(searchRes.data?.data) && searchRes.data.data.length > 0) {
          destToUse = searchRes.data.data[0];
          setSelectedDest(destToUse);
          saveState({ destination: destToUse, selectedDest: destToUse });
        } else {
          destToUse = {
            name: searchVal.trim(),
            country: 'Worldwide',
            id: searchVal.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            image: bgImage || 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1800&q=80'
          };
          setSelectedDest(destToUse);
          saveState({ destination: destToUse, selectedDest: destToUse });
        }
      } catch (e) {
        destToUse = {
          name: searchVal.trim(),
          country: 'Worldwide',
          id: searchVal.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          image: bgImage || 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1800&q=80'
        };
        setSelectedDest(destToUse);
        saveState({ destination: destToUse, selectedDest: destToUse });
      }
    }

    if (!destToUse || !destToUse.name?.trim()) {
      setValidationMsg('Please enter or select a destination to continue.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (travelers < 1 || travelers > 20) {
      setValidationMsg('Traveller count must be between 1 and 20.');
      return;
    }

    if (startDate) {
      const todayStr = getTodayDateString();
      if (startDate < todayStr) {
        setValidationMsg('Travel date cannot be in the past.');
        return;
      }
    }

    setValidationMsg('');
    setIsBuilding(true);

    const tripPayload = {
      destination: {
        ...(destToUse || selectedDest),
        name: (destToUse?.name || selectedDest?.name || '').trim(),
        country: destToUse?.country || selectedDest?.country || 'Worldwide',
        id: destToUse?.id || selectedDest?.id || (destToUse?.name || selectedDest?.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        image: destToUse?.image || selectedDest?.image || bgImage
      },
      duration,
      travelers,
      startDate: startDate || undefined,
      budget,
      interests,
      travelStyle
    };

    try {
      const res = await apiClient.createTrip(tripPayload);
      if (res.success && res.data?.data) {
        const savedTrip = res.data.data;
        localStorage.setItem('dastaanTrip', JSON.stringify(savedTrip));
        navigate(`/itinerary?id=${savedTrip._id}`);
        return;
      } else {
        // Backend validation or grounding error (e.g. 400 DESTINATION_NOT_FOUND, 422 INSUFFICIENT_ATTRACTIONS)
        const errorMsg = res.error || res.data?.message || 'Could not generate itinerary for this destination. Please verify the destination name or try another.';
        setValidationMsg(errorMsg);
        setIsBuilding(false);
        return;
      }

    } catch (err) {
      console.warn('[TripPlanner] Backend API call error:', err);
      // Offline fallback for curated catalog
      const isCurated = plannerDestinations.some(d => d.name.toLowerCase() === selectedDest.name.trim().toLowerCase());
      if (isCurated) {
        setTimeout(() => {
          navigate('/itinerary');
        }, 400);
        return;
      }

      setValidationMsg(err.message || 'Unable to connect to the itinerary service. Please ensure the server is running.');
      setIsBuilding(false);
    }
  };

  const perPersonEstimated = Math.round(budget / Math.max(1, travelers));

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
                placeholder="Search any city worldwide (e.g. Vancouver, Kyoto, Paris)..."
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
              <span className="popular-label">POPULAR CURATED DESTINATIONS</span>
              <div className="dest-tags" id="dest-tags">
                {plannerDestinations.map(dest => (
                  <button
                    key={dest.id}
                    type="button"
                    className={`dest-tag ${selectedDest?.name?.toLowerCase() === dest.name.toLowerCase() ? 'active' : ''}`}
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
            <p id="preview-country">{selectedDest ? (selectedDest.country || 'Worldwide') : 'To begin your story'}</p>
            {selectedDest && (
              <div className="preview-meta" id="preview-meta" style={{ display: 'block' }}>
                <span id="preview-duration">~{duration} days</span> &middot;{' '}
                <span id="preview-budget">~₹{budget?.toLocaleString('en-IN')} total</span>
                {travelers > 1 && (
                  <div className="preview-per-person">~₹{perPersonEstimated.toLocaleString('en-IN')}/person</div>
                )}
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

          {/* Row 1: Duration & Travelers */}
          <div className="journey-grid">
            {/* Duration */}
            <div className="journey-col duration-col">
              <span className="col-label">HOW MANY DAYS?</span>
              <div className="duration-control">

                <button
                  type="button"
                  id="btn-dur-minus"
                  onClick={() => handleDurationChange(duration - 1)}
                  disabled={duration <= 1}
                  aria-label="Decrease duration"
                >
                  &minus;
                </button>
                <div className="duration-display">
                  <span id="dur-val">{duration}</span>
                  <span className="dur-unit">{duration === 1 ? 'DAY' : 'DAYS'}</span>
                </div>

                <button
                  type="button"
                  id="btn-dur-plus"
                  onClick={() => handleDurationChange(duration + 1)}
                  disabled={duration >= 60}
                  aria-label="Increase duration"
                >
                  &plus;
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

            {/* Travelers */}
            <div className="journey-col travelers-col">
              <span className="col-label">WHO IS TRAVELLING?</span>
              <div className="travelers-control">
                <button
                  type="button"
                  id="btn-travelers-minus"
                  onClick={() => handleTravelersChange(travelers - 1)}
                  disabled={travelers <= 1}
                  aria-label="Decrease travelers"
                >
                  &minus;
                </button>
                <div className="travelers-display">
                  <span id="travelers-val">{travelers}</span>
                  <span className="travelers-unit">{travelers === 1 ? 'TRAVELLER' : 'TRAVELLERS'}</span>
                </div>
                <button
                  type="button"
                  id="btn-travelers-plus"
                  onClick={() => handleTravelersChange(travelers + 1)}
                  disabled={travelers >= 20}
                  aria-label="Increase travelers"
                >
                  &plus;
                </button>
              </div>

              <div className="preset-pills">
                {[1, 2, 4, 6].map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`preset-pill ${travelers === t ? 'active' : ''}`}
                    onClick={() => handleTravelersChange(t)}
                  >
                    {t === 1 ? 'Solo (1)' : t === 2 ? 'Couple (2)' : t === 4 ? 'Family (4)' : 'Group (6)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sub-divider between control rows */}
          <div className="journey-section-spacer"></div>

          {/* Row 2: Travel Dates & Budget */}
          <div className="journey-grid">
            {/* Start Date */}
            <div className="journey-col dates-col">
              <span className="col-label">WHEN ARE YOU GOING?</span>
              <div className="date-input-wrapper">
                <input
                  type="date"
                  id="start-date-input"
                  className="date-input"
                  min={getTodayDateString()}
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                />
              </div>

              <div className="date-preview-range">
                {startDate ? (
                  <>
                    <span className="date-range-text">{formatDateRangeDisplay(startDate, duration)}</span>
                    <button
                      type="button"
                      className="date-clear-btn"
                      onClick={() => handleStartDateChange('')}
                    >
                      Clear date (flexible)
                    </button>
                  </>
                ) : (
                  <span className="date-range-placeholder">Flexible dates &bull; Pick a start date anytime</span>
                )}
              </div>
            </div>

            <div className="journey-divider"></div>

            {/* Budget */}
            <div className="journey-col budget-col">
              <span className="col-label">TOTAL GROUP BUDGET</span>
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

              <div className="budget-per-person-hint">
                ~₹{perPersonEstimated.toLocaleString('en-IN')} / person for {travelers} {travelers === 1 ? 'traveller' : 'travellers'}
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
                  {selectedDest ? `${selectedDest.name}, ${selectedDest.country || 'Worldwide'}` : 'Not selected'}
                </span>
              </div>
              <div className="summary-item">
                <span className="sum-label">TRAVELLERS</span>
                <span className="sum-val" id="sum-travelers">
                  {travelers} {travelers === 1 ? 'Traveller' : 'Travellers'}
                </span>
              </div>
              <div className="summary-item">
                <span className="sum-label">DATES</span>
                <span className="sum-val" id="sum-dates">
                  {formatDateRangeDisplay(startDate, duration)}
                </span>
              </div>
              <div className="summary-item">
                <span className="sum-label">DURATION</span>
                <span className="sum-val" id="sum-dur">
                  {duration} Days
                </span>
              </div>
              <div className="summary-item">
                <span className="sum-label">TOTAL BUDGET</span>
                <span className="sum-val" id="sum-budget">
                  ₹{budget.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="summary-item">
                <span className="sum-label">PER PERSON</span>
                <span className="sum-val" id="sum-per-person">
                  ₹{perPersonEstimated.toLocaleString('en-IN')}
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
          {validationMsg && (
            <div className="validation-msg" id="validation-msg" role="alert">
              {validationMsg}
            </div>
          )}
          <button className="btn-build" id="btn-build" onClick={handleBuild} disabled={isBuilding}>
            {isBuilding ? 'BUILDING YOUR ITINERARY...' : 'BUILD MY ITINERARY \u2192'}
          </button>
          <p className="cta-sub">Your preferences will be grounded using real-world destinations and personalized travel pacing.</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
