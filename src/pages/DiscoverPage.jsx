import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { discoverDestinations } from '../data/destinations';
import { availableInterests, interestDescriptions } from '../data/interests';
import { calculateMatch, getFitLabel } from '../utils/scoring';
import '../styles/navigation.css';
import '../styles/discover.css';

const STORAGE_KEY = "dastaan_discover_state";

export default function DiscoverPage() {
  const navigate = useNavigate();

  const [durationRange, setDurationRange] = useState(null);
  const [budgetChoice, setBudgetChoice] = useState(null);
  const [customBudgetVal, setCustomBudgetVal] = useState('');
  const [isCustomBudget, setIsCustomBudget] = useState(false);
  const [interests, setInterests] = useState([]);
  const [travelStyle, setTravelStyle] = useState('Balanced');
  const [sortType, setSortType] = useState('match');

  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showClosest, setShowClosest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState('UNDERSTANDING YOUR JOURNEY...');
  const [validationMsg, setValidationMsg] = useState('');
  const [savedDestinations, setSavedDestinations] = useState([]);
  const [activeStep, setActiveStep] = useState('sec-01');

  const sec1Ref = useRef(null);
  const sec2Ref = useRef(null);
  const sec3Ref = useRef(null);
  const sec4Ref = useRef(null);
  const resultsRef = useRef(null);

  // Load saved Discover state and saved destinations
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.durationRange) setDurationRange(parsed.durationRange);
        if (parsed.budgetChoice) {
          setBudgetChoice(parsed.budgetChoice);
          if (parsed.isCustomBudget) {
            setIsCustomBudget(true);
            setCustomBudgetVal(String(parsed.budgetChoice));
          }
        }
        if (Array.isArray(parsed.interests)) setInterests(parsed.interests);
        if (parsed.travelStyle) setTravelStyle(parsed.travelStyle);
        if (parsed.sortType) setSortType(parsed.sortType);
      } catch (e) {
        console.error('Error loading discover state', e);
      }
    }

    const savedDests = localStorage.getItem('dastaanSaved');
    if (savedDests) {
      try {
        setSavedDestinations(JSON.parse(savedDests));
      } catch {}
    }
  }, []);

  // Save state helper
  const persistState = (updated) => {
    const currentState = {
      durationRange: updated.durationRange !== undefined ? updated.durationRange : durationRange,
      budgetChoice: updated.budgetChoice !== undefined ? updated.budgetChoice : budgetChoice,
      isCustomBudget: updated.isCustomBudget !== undefined ? updated.isCustomBudget : isCustomBudget,
      interests: updated.interests !== undefined ? updated.interests : interests,
      travelStyle: updated.travelStyle !== undefined ? updated.travelStyle : travelStyle,
      sortType: updated.sortType !== undefined ? updated.sortType : sortType
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
  };

  // Scroll active chapter observer
  useEffect(() => {
    const sections = [sec1Ref.current, sec2Ref.current, sec3Ref.current, sec4Ref.current].filter(Boolean);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveStep(entry.target.id);
        }
      });
    }, { rootMargin: '-25% 0px -35% 0px', threshold: 0 });

    sections.forEach(s => observer.observe(s));

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

    document.querySelectorAll('.reveal-on-scroll').forEach(el => revealObserver.observe(el));

    return () => {
      observer.disconnect();
      revealObserver.disconnect();
    };
  }, []);

  const handleDurationClick = (val) => {
    setDurationRange(val);
    persistState({ durationRange: val });
  };

  const handleBudgetTierClick = (val) => {
    setBudgetChoice(val);
    setIsCustomBudget(false);
    setCustomBudgetVal('');
    persistState({ budgetChoice: val, isCustomBudget: false });
  };

  const handleCustomBudgetInput = (val) => {
    setCustomBudgetVal(val);
    const parsed = parseInt(val);
    if (!isNaN(parsed) && parsed > 0) {
      setBudgetChoice(parsed);
      setIsCustomBudget(true);
      persistState({ budgetChoice: parsed, isCustomBudget: true });
    } else {
      setBudgetChoice(null);
      setIsCustomBudget(false);
      persistState({ budgetChoice: null, isCustomBudget: false });
    }
  };

  const toggleInterest = (interest) => {
    let updated;
    if (interests.includes(interest)) {
      updated = interests.filter(i => i !== interest);
    } else {
      updated = [...interests, interest];
    }
    setInterests(updated);
    persistState({ interests: updated });
  };

  const handleStyleClick = (style) => {
    setTravelStyle(style);
    persistState({ travelStyle: style });
  };

  const scrollToSection = (secRef) => {
    if (secRef?.current) {
      secRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const validateSelections = () => {
    setValidationMsg('');
    const missing = [];
    if (!durationRange) missing.push("time");
    if (!budgetChoice) missing.push("budget");
    if (!interests || interests.length === 0) missing.push("experiences");
    if (!travelStyle) missing.push("pace");

    if (missing.length > 0) {
      setValidationMsg(`Please select your preferred ${missing.join(", ")} before continuing.`);
      return false;
    }
    return true;
  };

  const runCalculation = (forceShowAll = false) => {
    const scored = discoverDestinations.map(dest => {
      const matchData = calculateMatch(dest, {
        durationRange,
        budgetChoice,
        interests,
        travelStyle
      });
      return { ...dest, score: matchData.score, reasons: matchData.reasons };
    });

    setResults(scored);
    setHasSearched(true);
    setShowClosest(forceShowAll);

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleDiscoverClick = () => {
    if (!validateSelections()) return;

    setLoading(true);
    setLoaderMessage('UNDERSTANDING YOUR JOURNEY...');

    setTimeout(() => {
      setLoaderMessage('FINDING PLACES THAT FIT...');
    }, 500);

    setTimeout(() => {
      setLoading(false);
      runCalculation(false);
    }, 1000);
  };

  const toggleSave = (id) => {
    let updated;
    if (savedDestinations.includes(id)) {
      updated = savedDestinations.filter(s => s !== id);
    } else {
      updated = [...savedDestinations, id];
    }
    setSavedDestinations(updated);
    localStorage.setItem('dastaanSaved', JSON.stringify(updated));
  };

  const handlePlanThisJourney = (dest) => {
    const tripPayload = {
      destination: {
        id: dest.id,
        name: dest.name,
        country: dest.country,
        image: dest.image,
        defaultDur: dest.days,
        defaultBud: dest.budget
      },
      duration: dest.days,
      budget: budgetChoice || dest.budget,
      interests: interests,
      travelStyle: travelStyle
    };
    localStorage.setItem('dastaanTrip', JSON.stringify(tripPayload));
    navigate('/plan');
  };

  // Summary labels
  let summaryBudget = "NOT SELECTED";
  if (budgetChoice) {
    if (isCustomBudget) {
      summaryBudget = `₹${budgetChoice.toLocaleString('en-IN')}`;
    } else {
      if (budgetChoice === 10000) summaryBudget = "UNDER ₹10K";
      else if (budgetChoice === 20000) summaryBudget = "₹10K–₹20K";
      else if (budgetChoice === 40000) summaryBudget = "₹20K–₹40K";
      else if (budgetChoice === 40001) summaryBudget = "₹40K+";
    }
  }

  // Filter & sort results
  const sortedResults = [...results].sort((a, b) => {
    if (sortType === 'budget') return a.budget - b.budget;
    if (sortType === 'duration') return a.days - b.days;
    return b.score - a.score;
  });

  const filteredResults = showClosest ? sortedResults : sortedResults.filter(r => r.score >= 45);
  const featured = filteredResults[0];
  const secondary = filteredResults.slice(1);

  const stepIndex = parseInt(activeStep.replace('sec-0', '')) || 1;
  const progressHeight = `${((stepIndex - 1) / 3) * 100}%`;

  return (
    <div className="discover-page">
      <Navbar isFixed={true} />

      {/* SECTION 1: CINEMATIC HERO */}
      <section className="discover-hero">
        <div className="hero-bg">
          <div className="image-placeholder">CINEMATIC LANDSCAPE IMAGE</div>
          <img
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1800&q=80"
            alt="Cinematic Travel Background"
            className="hero-img"
          />
          <div className="hero-overlay"></div>
        </div>
        <div className="container hero-content">
          <span className="hero-eyebrow">DASTAAN &middot; DISCOVER</span>
          <h1>WHERE WILL<br />YOUR STORY<br />TAKE YOU?</h1>
          <p className="hero-subtext">Tell us how you want to travel.<br />We'll narrow the world down to places that fit your story.</p>
        </div>
        <button
          className="hero-scroll-indicator"
          type="button"
          onClick={() => scrollToSection(sec1Ref)}
          aria-label="Scroll to Builder"
        >
          <span>BEGIN YOUR JOURNEY</span>
          <div className="scroll-arrow">&darr;</div>
        </button>
      </section>

      {/* MAIN DISCOVERY BUILDER */}
      <section className="discover-journey-section">
        <div className="container journey-container">

          {/* STICKY CHAPTER NAVIGATION */}
          <aside className="journey-sidebar" aria-label="Journey Progress">
            <div className="progress-indicator-sticky">
              <div className="progress-line-track">
                <div className="progress-line-fill" style={{ height: progressHeight }}></div>
              </div>
              <div className="progress-steps">
                <button
                  type="button"
                  className={`step ${activeStep === 'sec-01' ? 'active' : ''}`}
                  onClick={() => scrollToSection(sec1Ref)}
                >
                  <span className="step-num">01</span>
                  <span className="step-name">TIME</span>
                </button>
                <button
                  type="button"
                  className={`step ${activeStep === 'sec-02' ? 'active' : ''}`}
                  onClick={() => scrollToSection(sec2Ref)}
                >
                  <span className="step-num">02</span>
                  <span className="step-name">BUDGET</span>
                </button>
                <button
                  type="button"
                  className={`step ${activeStep === 'sec-03' ? 'active' : ''}`}
                  onClick={() => scrollToSection(sec3Ref)}
                >
                  <span className="step-num">03</span>
                  <span className="step-name">EXPERIENCE</span>
                </button>
                <button
                  type="button"
                  className={`step ${activeStep === 'sec-04' ? 'active' : ''}`}
                  onClick={() => scrollToSection(sec4Ref)}
                >
                  <span className="step-num">04</span>
                  <span className="step-name">PACE</span>
                </button>
              </div>
            </div>
          </aside>

          {/* CHAPTER CONTENT FLOW */}
          <div className="journey-content-flow">

            {/* SECTION 01: TIME */}
            <div className="form-section reveal-on-scroll" id="sec-01" ref={sec1Ref}>
              <span className="section-label">01 &middot; TIME</span>
              <h2 className="section-heading">HOW LONG IS YOUR ESCAPE?</h2>
              <p className="section-subtext">Choose the length of your journey.</p>

              <div className="options-grid" id="time-options">
                {[
                  { id: '2-3', title: '02\u201303 DAYS', desc: 'A short escape.' },
                  { id: '4-6', title: '04\u201306 DAYS', desc: 'Time to settle in.' },
                  { id: '6-7', title: '06\u201307 DAYS', desc: 'A deeper journey.' },
                  { id: '8+', title: '08+ DAYS', desc: 'Take your time.' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`select-card ${durationRange === opt.id ? 'active' : ''}`}
                    onClick={() => handleDurationClick(opt.id)}
                  >
                    <span className="card-title">{opt.title}</span>
                    <span className="card-desc">{opt.desc}</span>
                    <div className="active-indicator"></div>
                  </button>
                ))}
              </div>
            </div>

            <div className="journey-divider">
              <div className="divider-line"></div>
              <div className="divider-dot"></div>
              <div className="divider-line"></div>
            </div>

            {/* SECTION 02: BUDGET */}
            <div className="form-section reveal-on-scroll" id="sec-02" ref={sec2Ref}>
              <span className="section-label">02 &middot; BUDGET</span>
              <h2 className="section-heading">WHAT FEELS RIGHT FOR YOUR BUDGET?</h2>
              <p className="section-subtext">Select a range or enter a custom amount.</p>

              <div className="options-grid" id="budget-options">
                {[
                  { val: 10000, title: 'UNDER \u20B910K', desc: 'Budget friendly.' },
                  { val: 20000, title: '\u20B910K \u2013 \u20B920K', desc: 'Comfortable escape.' },
                  { val: 40000, title: '\u20B920K \u2013 \u20B940K', desc: 'Premium adventure.' },
                  { val: 40001, title: '\u20B940K+', desc: 'Ultimate luxury.' }
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    className={`select-card ${!isCustomBudget && budgetChoice === opt.val ? 'active' : ''}`}
                    onClick={() => handleBudgetTierClick(opt.val)}
                  >
                    <span className="card-title">{opt.title}</span>
                    <span className="card-desc">{opt.desc}</span>
                    <div className="active-indicator"></div>
                  </button>
                ))}
              </div>

              <div className="custom-budget-container">
                <span className="custom-label">CUSTOM AMOUNT</span>
                <div className="input-wrapper">
                  <span className="currency">₹</span>
                  <input
                    type="number"
                    id="budget-numeric"
                    placeholder="Enter custom amount..."
                    aria-label="Custom budget amount"
                    value={customBudgetVal}
                    onChange={(e) => handleCustomBudgetInput(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="journey-divider">
              <div className="divider-line"></div>
              <div className="divider-dot"></div>
              <div className="divider-line"></div>
            </div>

            {/* SECTION 03: EXPERIENCE */}
            <div className="form-section reveal-on-scroll" id="sec-03" ref={sec3Ref}>
              <span className="section-label">03 &middot; EXPERIENCE</span>
              <div className="title-with-count">
                <h2 className="section-heading">WHAT DO YOU WANT TO EXPERIENCE?</h2>
                <span className="selection-count" id="interests-count">
                  {interests.length} SELECTED
                </span>
              </div>
              <p className="section-subtext">Choose what you want your journey to feel like.</p>

              <div className="experience-grid" id="interests-options">
                {availableInterests.map(interest => {
                  const meta = interestDescriptions[interest] || { icon: '✨', desc: 'Tailored experience.' };
                  const isSelected = interests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      className={`exp-card ${isSelected ? 'active' : ''}`}
                      onClick={() => toggleInterest(interest)}
                    >
                      <div className="exp-card-header">
                        <span className="exp-icon">{meta.icon}</span>
                        <span className="exp-title">{interest.toUpperCase()}</span>
                      </div>
                      <span className="exp-desc">{meta.desc}</span>
                      <div className="active-indicator"></div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="journey-divider">
              <div className="divider-line"></div>
              <div className="divider-dot"></div>
              <div className="divider-line"></div>
            </div>

            {/* SECTION 04: PACE */}
            <div className="form-section reveal-on-scroll" id="sec-04" ref={sec4Ref}>
              <span className="section-label">04 &middot; PACE</span>
              <h2 className="section-heading">HOW DO YOU LIKE TO TRAVEL?</h2>
              <p className="section-subtext">Choose a pace that suits your style.</p>

              <div className="pace-grid" id="style-options">
                {[
                  { style: 'Relaxed', desc: '"Slow mornings, fewer stops."' },
                  { style: 'Balanced', desc: '"See the best without rushing."' },
                  { style: 'Packed', desc: '"Make every moment count."' }
                ].map(opt => (
                  <button
                    key={opt.style}
                    type="button"
                    className={`pace-card ${travelStyle === opt.style ? 'active' : ''}`}
                    onClick={() => handleStyleClick(opt.style)}
                  >
                    <div className="pace-card-header">
                      <h4>{opt.style.toUpperCase()}</h4>
                      <div className="active-indicator"></div>
                    </div>
                    <p>{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="journey-divider">
              <div className="divider-line"></div>
              <div className="divider-dot"></div>
              <div className="divider-line"></div>
            </div>

            {/* TRAVEL PROFILE SUMMARY */}
            <div className="travel-profile-section reveal-on-scroll">
              <span className="section-label">YOUR TRAVEL PROFILE</span>
              <h2 className="section-heading">NOW WE KNOW HOW YOU LIKE TO TRAVEL.</h2>
              <p className="section-subtext">Review your preferences before discovering your next destination.</p>

              <div className="profile-card">
                <div className="profile-grid">
                  <div className="profile-item">
                    <span className="profile-label">TIME</span>
                    <span className="profile-val" id="sum-time">
                      {durationRange ? `${durationRange.replace('-', '\u2013')} Days`.toUpperCase() : "NOT SELECTED"}
                    </span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">BUDGET</span>
                    <span className="profile-val" id="sum-budget">
                      {summaryBudget}
                    </span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">EXPERIENCE</span>
                    <span className="profile-val" id="sum-exp">
                      {interests.length > 0 ? interests.join(' \u00B7 ').toUpperCase() : "NOT SELECTED"}
                    </span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">PACE</span>
                    <span className="profile-val" id="sum-pace">
                      {travelStyle ? travelStyle.toUpperCase() : "NOT SELECTED"}
                    </span>
                  </div>
                </div>
              </div>

              {/* PRIMARY ACTION CTA */}
              <div className="cta-container">
                {validationMsg && (
                  <div className="validation-msg" style={{ display: 'block', marginBottom: '16px' }}>
                    {validationMsg}
                  </div>
                )}
                <button
                  type="button"
                  className="btn-discover-primary"
                  id="btn-find-destinations"
                  onClick={handleDiscoverClick}
                >
                  DISCOVER MY DESTINATIONS &rarr;
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CINEMATIC SEARCH LOADER SCREEN */}
      {loading && (
        <div className="cinematic-loader" id="cinematic-loader" style={{ display: 'flex' }}>
          <div className="loader-content">
            <div className="loader-spinner"></div>
            <div className="loader-message" id="loader-message">{loaderMessage}</div>
          </div>
        </div>
      )}

      {/* TRUST/GUIDE ME SECTION */}
      <section className="trust-section">
        <div className="container text-center">
          <h2>NOT SURE WHERE TO START?</h2>
          <p className="trust-desc">You don't need a destination in mind.<br />Tell us what kind of journey you want, and we'll narrow the world down.</p>
          <button type="button" className="btn-guide-me" onClick={() => scrollToSection(sec1Ref)}>
            LET DASTAAN GUIDE YOU &rarr;
          </button>
        </div>
      </section>

      {/* RESULTS SECTION */}
      {hasSearched && (
        <section className="discover-results" id="results-section" ref={resultsRef} style={{ display: 'block' }}>
          <div className="container">
            <div className="results-header">
              <span className="results-eyebrow">YOUR NEXT CHAPTER</span>
              <h2>PLACES THAT FIT THE WAY YOU WANT TO TRAVEL</h2>

              <div className="results-tools">
                <span id="results-count" className="results-count">
                  {filteredResults.length} destination{filteredResults.length !== 1 ? 's' : ''} found
                </span>
                <div className="sort-wrapper">
                  <span>SORT BY:</span>
                  <select
                    id="sort-select"
                    aria-label="Sort destinations"
                    value={sortType}
                    onChange={(e) => {
                      setSortType(e.target.value);
                      persistState({ sortType: e.target.value });
                    }}
                  >
                    <option value="match">Best Match</option>
                    <option value="budget">Lowest Budget</option>
                    <option value="duration">Shortest Trip</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {filteredResults.length === 0 ? (
              <div id="empty-state" className="empty-state" style={{ display: 'block' }}>
                <h3>WE COULDN'T FIND A PERFECT MATCH</h3>
                <p>Try widening your budget or changing your duration preferences.</p>
                <div className="empty-actions">
                  <button type="button" className="btn-outline" onClick={() => scrollToSection(sec1Ref)}>
                    ADJUST PREFERENCES
                  </button>
                  <button type="button" className="btn-primary" onClick={() => runCalculation(true)}>
                    SHOW CLOSEST MATCHES
                  </button>
                </div>
              </div>
            ) : (
              <div id="results-container" className="results-container">
                {/* Featured Top Match Card */}
                {featured && (
                  <div className="featured-card reveal-on-scroll revealed">
                    <div className="featured-image-wrap">
                      <span className="match-score">
                        {featured.score}% {getFitLabel(featured.score)}
                      </span>
                      <img className="destination-image" src={featured.image} alt={featured.name} />
                    </div>
                    <div className="featured-content">
                      <h3>{featured.name}</h3>
                      <span className="dest-country">{featured.country}</span>
                      <p className="dest-desc">{featured.description}</p>

                      <div className="dest-why">
                        <strong>Why it fits:</strong> Fits your timeframe, matching your travel pace and experience preference.
                      </div>

                      <div className="experience-tags">
                        {featured.interests.map(t => (
                          <span key={t} className="tag">{t}</span>
                        ))}
                      </div>

                      <div className="dest-meta">
                        <div className="meta-item">
                          <span className="meta-label">Estimated Budget</span>
                          <span className="meta-val">₹{featured.budget.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-label">Recommended Time</span>
                          <span className="meta-val">{featured.days} Days</span>
                        </div>
                      </div>

                      <div className="card-actions">
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => handlePlanThisJourney(featured)}
                        >
                          PLAN THIS JOURNEY &rarr;
                        </button>
                        <button
                          type="button"
                          className={`btn-outline save-btn ${savedDestinations.includes(featured.id) ? 'saved' : ''}`}
                          onClick={() => toggleSave(featured.id)}
                        >
                          {savedDestinations.includes(featured.id) ? '\u2713 SAVED' : 'SAVE JOURNEY'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Secondary Cards Grid */}
                {secondary.length > 0 && (
                  <div className="secondary-grid">
                    {secondary.map(dest => (
                      <div key={dest.id} className="secondary-card reveal-on-scroll revealed">
                        <div className="secondary-image-wrap">
                          <span className="match-score">
                            {dest.score}% {getFitLabel(dest.score)}
                          </span>
                          <img className="destination-image" src={dest.image} alt={dest.name} />
                        </div>
                        <div className="secondary-content">
                          <h4>{dest.name}</h4>
                          <span className="dest-country">{dest.country}</span>
                          <p className="dest-desc">{dest.description}</p>

                          <div className="dest-why">
                            <strong>Why it fits:</strong> Tailored to your pace preference and cultural expectations.
                          </div>

                          <div className="experience-tags">
                            {dest.interests.map(t => (
                              <span key={t} className="tag">{t}</span>
                            ))}
                          </div>

                          <div className="dest-meta">
                            <div className="meta-item">
                              <span className="meta-label">Estimated Budget</span>
                              <span className="meta-val">₹{dest.budget.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="meta-item">
                              <span className="meta-label">Duration</span>
                              <span className="meta-val">{dest.days} Days</span>
                            </div>
                          </div>

                          <div className="card-actions">
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() => handlePlanThisJourney(dest)}
                            >
                              PLAN THIS JOURNEY &rarr;
                            </button>
                            <button
                              type="button"
                              className={`btn-outline save-btn ${savedDestinations.includes(dest.id) ? 'saved' : ''}`}
                              onClick={() => toggleSave(dest.id)}
                            >
                              {savedDestinations.includes(dest.id) ? '\u2713 SAVED' : 'SAVE JOURNEY'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
