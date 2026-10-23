import React, { useState, useEffect, useRef, useMemo } from 'react';
import { mockItineraries } from '../../data/itineraries';
import { INSPIRATION_DESTINATIONS } from '../../data/inspirationData';
import { getSharedThemes } from './StoryConstellation';

/**
 * Dastaan Journey Reel Modal
 * 
 * Signature 4-Chapter Editorial Journey Experience:
 * - Chapter 01: The Story (Atmospheric Immersion & Editorial Narrative)
 * - Chapter 02: The Moments (Curated Vignettes, Lightbox Inspection & Follow-A-Thread)
 * - Chapter 03: The First 48 Hours (Curated Reference Itinerary or Verified Highlights Fallback)
 * - Chapter 04: Your Trip at a Glance (Practical Metrics & Handoff to /plan)
 * 
 * Architecture Rules:
 * - Decoupled from LightboxModal: Opening a vignette opens LightboxModal on top (z-index: 2100).
 * - Closing LightboxModal restores focus to the same chapter in JourneyReelModal.
 * - Escape key priority: If Lightbox is open, Lightbox consumes Escape. JourneyReelModal only closes if Lightbox is not active.
 * - No fabricated itinerary data: If destination does not have a day-by-day dataset in mockItineraries,
 *   renders an honest "Curated Experiential Highlights" fallback using verified trip metadata.
 * - Follow-A-Thread switches activeJourneyDest in-place without creating stacked modals.
 */
export default function JourneyReelModal({
  isOpen,
  destination,
  onClose,
  onPlan,
  isSaved,
  onToggleSave,
  onOpenLightbox,
  onSelectDestination,
  isLightboxActive = false
}) {
  const [activeChapter, setActiveChapter] = useState(0);
  const [activeDay, setActiveDay] = useState(1);
  const [advanceDir, setAdvanceDir] = useState('forward');
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [imgError, setImgError] = useState(false);
  const containerRef = useRef(null);
  const advanceTimerRef = useRef(null);
  const finishTimerRef = useRef(null);

  // Clean up animation timers on unmount
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    };
  }, []);

  // Compute verified related destinations ("Follow a Thread") based strictly on shared categories/interests
  const relatedThreads = useMemo(() => {
    if (!destination?.id) return [];
    const others = INSPIRATION_DESTINATIONS.filter((d) => d.id !== destination.id);
    const scored = [];

    others.forEach((other) => {
      const theme = getSharedThemes(destination, other);
      if (theme) {
        scored.push({
          destination: other,
          theme,
          connectionReason: theme.primaryLabel,
          strength: theme.strength
        });
      }
    });

    // Sort by strongest thematic connection and take top 2
    scored.sort((a, b) => b.strength - a.strength);
    return scored.slice(0, 2);
  }, [destination]);

  // Reset chapter and day state whenever destination changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveChapter(0);
      setActiveDay(1);
      setAdvanceDir('forward');
      setIsAdvancing(false);
      setImgError(false);
    }
  }, [isOpen, destination?.id]);

  // Body scroll lock management
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      // Only unlock if Lightbox isn't still holding the lock
      if (!isLightboxActive) {
        document.body.style.overflow = prevOverflow || '';
      }
    };
  }, [isOpen, isLightboxActive]);

  // Keyboard navigation (Escape, ArrowRight, ArrowLeft)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      // If LightboxModal is open on top, let it handle Escape
      if (isLightboxActive) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToChapter((prev) => Math.min(prev + 1, 3));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToChapter((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLightboxActive, onClose]);

  if (!isOpen || !destination) return null;

  // Itinerary lookup strictly from existing mockItineraries
  const itinerary = mockItineraries[destination.id] || null;
  const daysList = itinerary?.days || [];
  const currentDayData = daysList.find((d) => d.dayNum === activeDay) || daysList[0] || null;

  // Chapter navigation helper with 2-phase film advance animation
  const goToChapter = (target) => {
    const nextIdx = typeof target === 'function' ? target(activeChapter) : target;
    if (nextIdx === activeChapter || isAdvancing) return;
    const dir = nextIdx > activeChapter ? 'forward' : 'backward';
    setAdvanceDir(dir);
    setIsAdvancing(true);

    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);

    advanceTimerRef.current = setTimeout(() => {
      setActiveChapter(nextIdx);
      if (containerRef.current) {
        containerRef.current.scrollTo({ top: 0, behavior: 'instant' });
      }
      finishTimerRef.current = setTimeout(() => {
        setIsAdvancing(false);
      }, 350);
    }, 200);
  };

  const CHAPTERS = [
    { id: 0, num: '01', title: 'THE STORY' },
    { id: 1, num: '02', title: 'THE MOMENTS' },
    { id: 2, num: '03', title: 'THE FIRST 48 HOURS' },
    { id: 3, num: '04', title: 'AT A GLANCE' }
  ];

  return (
    <div
      className="journey-reel-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Journey Reel for ${destination.name}`}
    >
      {/* Dimmed backdrop with radial focus */}
      <div
        className="journey-reel-backdrop"
        onClick={() => {
          if (!isLightboxActive) onClose();
        }}
        aria-hidden="true"
      />

      {/* Static dim photo backdrop per Amendment 4 */}
      <div
        className="journey-reel-photo-backdrop"
        style={{
          backgroundImage: `url(${imgError ? '/images/jaipur/amerfortandasheeshmahal.jpg' : (destination.heroImage || destination.image)})`
        }}
        aria-hidden="true"
      />

      {/* Main Reel Shell */}
      <div className="journey-reel-modal">
        {/* REEL TOPBAR */}
        <header className="journey-reel-header">
          <div className="journey-reel-meta">
            <span className="journey-reel-badge">DASTAAN JOURNEY REEL</span>
            <span className="journey-reel-dest-name">
              {destination.name} · {destination.country}
            </span>
          </div>

          {/* Close button with high-contrast tactile styling */}
          <button
            type="button"
            className="journey-reel-close-btn"
            onClick={onClose}
            aria-label="Close Journey Reel (Esc)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>

        {/* PROGRESS STEPPER BAR */}
        <nav className="journey-reel-progress" aria-label="Journey Chapters">
          <div className="journey-reel-steps-wrap">
            {/* Sliding active tab glider */}
            <div
              className="reel-tab-sliding-glider"
              style={{
                left: `calc(${activeChapter} * ((100% - 36px) / 4 + 12px))`,
                width: 'calc((100% - 36px) / 4)'
              }}
              aria-hidden="true"
            />
            {CHAPTERS.map((ch) => {
              const isActive = activeChapter === ch.id;
              const isPast = activeChapter > ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  className={`journey-reel-step-btn ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}
                  onClick={() => goToChapter(ch.id)}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className="step-num">{ch.num}</span>
                  <span className="step-title">{ch.title}</span>
                  <span className="step-indicator-bar" />
                </button>
              );
            })}
          </div>
        </nav>

        {/* SCROLLABLE CHAPTER CONTENT CONTAINER */}
        <div
          ref={containerRef}
          className={`journey-reel-content ${isAdvancing ? `film-advance-outgoing dir-${advanceDir}` : `film-advance-incoming dir-${advanceDir}`}`}
        >
          {/* =================================================================
              CHAPTER 01: THE STORY (Atmospheric Immersion)
             ================================================================= */}
          {activeChapter === 0 && (
            <section className="journey-chapter journey-chapter-story" aria-label="Chapter 1: The Story">
              <div className="chapter-story-grid">
                {/* Visual Reveal */}
                <div className="chapter-story-visual">
                  <div className="chapter-image-frame">
                    <img
                      src={imgError ? '/images/jaipur/amerfortandasheeshmahal.jpg' : destination.heroImage}
                      alt={`${destination.name}, ${destination.region}`}
                      className="chapter-hero-img"
                      onError={() => setImgError(true)}
                    />
                    <div className="chapter-image-gold-accent" />
                    <span className="chapter-image-caption">
                      {destination.region}, {destination.country}
                    </span>
                  </div>
                </div>

                {/* Editorial Typography */}
                <div className="chapter-story-narrative">
                  <span className="chapter-eyebrow">CHAPTER 01 · THE ESSENCE</span>
                  <h2 className="chapter-dest-title">{destination.name}</h2>
                  <p className="chapter-tagline">"{destination.tagline}"</p>

                  <div className="chapter-narrative-divider" />

                  <p className="chapter-editorial-text">
                    {destination.editorialNarrative || destination.description}
                  </p>

                  <div className="chapter-story-meta-pills">
                    {destination.categoryLabels?.map((cat, idx) => (
                      <span key={idx} className="insp-pill-tag">
                        {cat}
                      </span>
                    ))}
                  </div>

                  <div className="chapter-action-row">
                    <button
                      type="button"
                      className="btn-reel-primary"
                      onClick={() => goToChapter(1)}
                    >
                      STEP TO MOMENTS &rarr;
                    </button>
                    <span className="chapter-hint-text">Or press &rarr; to advance</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* =================================================================
              CHAPTER 02: THE MOMENTS (Curated Photo Vignettes)
             ================================================================= */}
          {activeChapter === 1 && (
            <section className="journey-chapter journey-chapter-moments" aria-label="Chapter 2: The Moments">
              <div className="chapter-header-box">
                <span className="chapter-eyebrow">CHAPTER 02 · CURATED DETAILS</span>
                <h2 className="chapter-section-heading">Moments That Define {destination.name}</h2>
                <p className="chapter-section-desc">
                  Intimate sensory vignettes and architectural rhythms. Select any frame for high-resolution inspection.
                </p>
              </div>

              {/* 3 Vignette Cards */}
              <div className="chapter-vignettes-grid">
                {destination.vignettes && destination.vignettes.length > 0 ? (
                  destination.vignettes.map((vig, idx) => (
                    <article
                      key={idx}
                      className="chapter-vignette-card"
                      onClick={() =>
                        onOpenLightbox({
                          title: vig.title,
                          desc: vig.desc,
                          cat: vig.cat,
                          destBadge: `${destination.name}, ${destination.country}`,
                          imgSrc: vig.image,
                          imgLabel: vig.title.toUpperCase()
                        })
                      }
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onOpenLightbox({
                            title: vig.title,
                            desc: vig.desc,
                            cat: vig.cat,
                            destBadge: `${destination.name}, ${destination.country}`,
                            imgSrc: vig.image,
                            imgLabel: vig.title.toUpperCase()
                          });
                        }
                      }}
                      aria-label={`Inspect ${vig.title}`}
                    >
                      <div className="vignette-card-media">
                        <img
                          src={vig.image}
                          alt={vig.title}
                          loading="lazy"
                          onError={(e) => {
                            if (destination.heroImage && e.target.src !== destination.heroImage) {
                              e.target.src = destination.heroImage;
                            } else {
                              e.target.src = '/images/jaipur/hawamahal.jpg';
                            }
                          }}
                        />
                        <span className="vignette-category-tag">{vig.cat}</span>
                        <div className="vignette-zoom-icon" aria-hidden="true">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                          </svg>
                        </div>
                      </div>
                      <div className="vignette-card-body">
                        <h4 className="vignette-card-title">{vig.title}</h4>
                        <p className="vignette-card-desc">{vig.desc}</p>
                        <span className="vignette-inspect-label">CLICK TO INSPECT &rarr;</span>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="chapter-empty-note">No vignettes available for this collection.</p>
                )}
              </div>

              {/* Curated Highlights List */}
              {destination.highlights && destination.highlights.length > 0 && (
                <div className="chapter-highlights-banner">
                  <h4 className="chapter-highlights-title">CURATED SIGHTS & ATMOSPHERES</h4>
                  <ul className="chapter-highlights-list">
                    {destination.highlights.map((h, i) => (
                      <li key={i}>
                        <span className="highlight-bullet">&#9670;</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* FOLLOW A THREAD · THEMATICALLY CONNECTED JOURNEYS */}
              {relatedThreads && relatedThreads.length > 0 && (
                <div className="chapter-threads-banner">
                  <div className="threads-header-wrap">
                    <span className="threads-kicker">✦ FOLLOW A THREAD</span>
                    <h4 className="threads-title">Connected Stories in the Constellation</h4>
                    <p className="threads-desc">
                      Journeys sharing cultural rhythms and sensory threads with {destination.name}. Select any thread to step directly into its story.
                    </p>
                  </div>

                  <div className="threads-cards-grid">
                    {relatedThreads.map(({ destination: relDest, connectionReason }, idx) => (
                      <article
                        key={idx}
                        className="thread-preview-card"
                        onClick={() => onSelectDestination && onSelectDestination(relDest)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectDestination && onSelectDestination(relDest);
                          }
                        }}
                        aria-label={`Follow thread to ${relDest.name}`}
                      >
                        <div className="thread-card-thumb">
                          <img
                            src={relDest.heroImage}
                            alt={relDest.name}
                            loading="lazy"
                            onError={(e) => {
                              e.target.src = '/images/jaipur/amerfortandasheeshmahal.jpg';
                            }}
                          />
                          <span className="thread-arrow-badge">&rarr;</span>
                        </div>
                        <div className="thread-card-info">
                          <span className="thread-dest-name">
                            {relDest.name} · {relDest.country}
                          </span>
                          <span className="thread-reason-text">
                            {connectionReason}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              <div className="chapter-action-row chapter-action-between">
                <button
                  type="button"
                  className="btn-reel-ghost"
                  onClick={() => goToChapter(0)}
                >
                  &larr; BACK TO STORY
                </button>
                <button
                  type="button"
                  className="btn-reel-primary"
                  onClick={() => goToChapter(2)}
                >
                  CONTINUE TO 48 HOURS &rarr;
                </button>
              </div>
            </section>
          )}

          {/* =================================================================
              CHAPTER 03: THE FIRST 48 HOURS (Curated Itinerary Preview / Honest Fallback)
             ================================================================= */}
          {activeChapter === 2 && (
            <section className="journey-chapter journey-chapter-itinerary" aria-label="Chapter 3: The First 48 Hours">
              <div className="chapter-header-box">
                <span className="chapter-eyebrow">CHAPTER 03 · THE FIRST 48 HOURS</span>
                <h2 className="chapter-section-heading">Curated Cultural Rhythm</h2>
                <p className="chapter-section-desc">
                  Curated reference route from Dastaan's editorial archives. Sights and pacing reflect signature cultural tempos.
                </p>
              </div>

              {itinerary && daysList.length > 0 ? (
                /* CASE A: Verified Itinerary Exists in itineraries.js */
                <div className="chapter-timeline-wrap">
                  {/* Day Tabs */}
                  {daysList.length > 1 && (
                    <div className="chapter-day-tabs" role="tablist" aria-label="Itinerary Days">
                      {daysList.map((d) => (
                        <button
                          key={d.dayNum}
                          type="button"
                          role="tab"
                          aria-selected={activeDay === d.dayNum}
                          className={`chapter-day-tab ${activeDay === d.dayNum ? 'active' : ''}`}
                          onClick={() => setActiveDay(d.dayNum)}
                        >
                          <span className="day-tab-num">DAY {d.dayNum}</span>
                          <span className="day-tab-title">{d.dayTitle}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Single Day Title if only 1 day */}
                  {daysList.length === 1 && currentDayData && (
                    <div className="chapter-single-day-label">
                      <span className="badge-gold">DAY 1</span>
                      <span className="title-text">{currentDayData.dayTitle}</span>
                    </div>
                  )}

                  {/* Day Activities Timeline */}
                  {currentDayData && (
                    <div className="chapter-timeline-list" role="tabpanel">
                      {currentDayData.activities.map((act, idx) => (
                        <article key={idx} className="timeline-item">
                          <div className="timeline-time-col">
                            <span className="timeline-time-badge">{act.time}</span>
                            <span className="timeline-cat-pill">{act.cat}</span>
                          </div>

                          <div className="timeline-content-card">
                            <div className="timeline-text-body">
                              <h4 className="timeline-act-title">{act.title}</h4>
                              <p className="timeline-act-desc">{act.desc}</p>
                            </div>

                            {act.image && (
                              <div className="timeline-act-media">
                                <img
                                  src={act.image}
                                  alt={act.title}
                                  loading="lazy"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* CASE B: Honest Fallback for Destinations without dedicated day-by-day dataset */
                <div className="chapter-honest-fallback">
                  <div className="fallback-banner">
                    <div className="fallback-badge">CURATED EXPERIENTIAL HIGHLIGHTS</div>
                    <p className="fallback-notice">
                      A day-by-day itinerary preview is currently unavailable for {destination.name}.
                      Below are the verified highlights, travel style, and signature atmospheres curated for this destination.
                    </p>
                  </div>

                  {destination.highlights && destination.highlights.length > 0 && (
                    <div className="fallback-highlights-grid">
                      {destination.highlights.map((h, i) => (
                        <div key={i} className="fallback-highlight-card">
                          <span className="fallback-number">0{i + 1}</span>
                          <p className="fallback-highlight-text">{h}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="fallback-metadata-row">
                    <div className="fallback-meta-pill">
                      <span className="pill-label">RECOMMENDED PACE</span>
                      <span className="pill-val">{destination.travelStyle || 'Balanced'}</span>
                    </div>
                    <div className="fallback-meta-pill">
                      <span className="pill-label">ESTIMATED DURATION</span>
                      <span className="pill-val">{destination.durationText || '3 Days'}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="chapter-action-row chapter-action-between">
                <button
                  type="button"
                  className="btn-reel-ghost"
                  onClick={() => goToChapter(1)}
                >
                  &larr; BACK TO MOMENTS
                </button>
                <button
                  type="button"
                  className="btn-reel-primary"
                  onClick={() => goToChapter(3)}
                >
                  VIEW TRIP AT A GLANCE &rarr;
                </button>
              </div>
            </section>
          )}

          {/* =================================================================
              CHAPTER 04: AT A GLANCE (Practical Metrics & Seamless Planning Handoff)
             ================================================================= */}
          {activeChapter === 3 && (
            <section className="journey-chapter journey-chapter-glance" aria-label="Chapter 4: Your Trip at a Glance">
              <div className="chapter-header-box text-center">
                <span className="chapter-eyebrow">CHAPTER 04 · YOUR TRIP BLUEPRINT</span>
                <h2 className="chapter-section-heading">Your Journey at a Glance</h2>
                <p className="chapter-section-desc">
                  Practical parameters curated for {destination.name}. Ready to craft your customized itinerary?
                </p>
              </div>

              {/* 4 Practical Metric Cards */}
              <div className="chapter-metrics-grid">
                <div className="metric-card">
                  <div className="metric-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </div>
                  <span className="metric-label">RECOMMENDED DURATION</span>
                  <span className="metric-value">{destination.durationText}</span>
                  <span className="metric-sub">Curated pace</span>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                  </div>
                  <span className="metric-label">INDICATIVE BUDGET</span>
                  <span className="metric-value">{destination.budgetRange}</span>
                  <span className="metric-sub">Estimated per traveler</span>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </div>
                  <span className="metric-label">TRAVEL PACE</span>
                  <span className="metric-value">{destination.travelStyle || 'Balanced'}</span>
                  <span className="metric-sub">Daily sightseeing rhythm</span>
                </div>

                <div className="metric-card">
                  <div className="metric-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                      <line x1="7" y1="7" x2="7.01" y2="7"></line>
                    </svg>
                  </div>
                  <span className="metric-label">PRIMARY INTERESTS</span>
                  <div className="metric-tags-wrap">
                    {destination.interests?.map((item, idx) => (
                      <span key={idx} className="metric-pill">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Editorial Launchpad Card */}
              <div className="chapter-handoff-box">
                <div className="handoff-content">
                  <h3 className="handoff-title">Ready to Make This Journey Yours?</h3>
                  <p className="handoff-desc">
                    Proceed to the Dastaan Trip Configurator with {destination.name} pre-loaded.
                    Fine-tune dates, pace, budget, and activities before locking your itinerary.
                  </p>
                </div>

                <div className="handoff-actions">
                  <button
                    type="button"
                    className="btn-handoff-plan"
                    onClick={() => onPlan(destination)}
                  >
                    PLAN THIS TRIP &rarr;
                  </button>

                  <button
                    type="button"
                    className={`btn-handoff-save ${isSaved ? 'saved' : ''}`}
                    onClick={() => onToggleSave(destination)}
                    aria-label={isSaved ? `Remove ${destination.name} from saved` : `Save ${destination.name} to archive`}
                  >
                    {isSaved ? '✓ SAVED TO ARCHIVE' : '♡ SAVE JOURNEY'}
                  </button>
                </div>
              </div>

              <div className="chapter-action-row chapter-action-center">
                <button
                  type="button"
                  className="btn-reel-ghost"
                  onClick={() => goToChapter(0)}
                >
                  &#8634; REPLAY JOURNEY REEL
                </button>
              </div>
            </section>
          )}
        </div>

        {/* BOTTOM CONTROLS FOOTER */}
        <footer className="journey-reel-footer">
          <div className="reel-footer-nav">
            <button
              type="button"
              className="reel-nav-btn"
              disabled={activeChapter === 0}
              onClick={() => goToChapter((prev) => Math.max(prev - 1, 0))}
              aria-label="Previous chapter"
            >
              &larr; PREV
            </button>

            <span className="reel-chapter-counter">
              CHAPTER {activeChapter + 1} OF 4
            </span>

            <button
              type="button"
              className="reel-nav-btn"
              disabled={activeChapter === 3}
              onClick={() => goToChapter((prev) => Math.min(prev + 1, 3))}
              aria-label="Next chapter"
            >
              NEXT &rarr;
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
