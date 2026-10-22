import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { plannerDestinations } from '../data/destinations';
import { availableInterests } from '../data/interests';
import apiClient from '../services/api';
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

  // Save changes to localStorage
  const saveState = (updated) => {
    const tripPayload = {
      destination: updated.selectedDest !== undefined ? updated.selectedDest : selectedDest,
      duration: updated.duration !== undefined ? updated.duration : duration,
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

    // Crossfade background image
    setBgOpacity(0);
    setTimeout(() => {
      setBgImage(dest.image);
      setBgOpacity(1);
    }, 400);

    saveState({ selectedDest: dest });
  };

  const handleSearchInput = (val) => {
    setSearchVal(val);
    const found = plannerDestinations.find(d => d.name.toLowerCase().includes(val.toLowerCase()));
    if (found && val.length > 2) {
      handleSelectDest(found);
    }
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
    if (!selectedDest) {
      setValidationMsg('Please select a destination to continue.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setValidationMsg('');
    setIsBuilding(true);

    const tripPayload = {
      destination: selectedDest,
      duration,
      budget,
      interests,
      travelStyle
    };

    // Store in localStorage for instant access
    localStorage.setItem('dastaanTrip', JSON.stringify(tripPayload));

    try {
      const res = await apiClient.createTrip(tripPayload);
      if (res.success && res.data?.data) {
        const savedTrip = res.data.data;
        localStorage.setItem('dastaanTrip', JSON.stringify(savedTrip));
        navigate(`/itinerary?id=${savedTrip._id}`);
        return;
      }
    } catch (err) {
      console.warn('[TripPlanner] Backend API call failed, navigating with local state:', err);
    }

    setTimeout(() => {
      navigate('/itinerary');
    }, 400);
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

            <div className="search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                id="dest-search"
                placeholder="Search for a city or destination..."
                autoComplete="off"
                value={searchVal}
                onChange={(e) => handleSearchInput(e.target.value)}
              />
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
                <button type="button" id="btn-dur-minus" onClick={() => handleDurationChange(duration - 1)}>
                  &minus;
                </button>
                <div className="duration-display">
                  <span id="dur-val">{duration}</span>
                  <span className="dur-unit">DAYS</span>
                </div>
                <button type="button" id="btn-dur-plus" onClick={() => handleDurationChange(duration + 1)}>
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
