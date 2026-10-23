import React, { useState, useEffect, useMemo, useRef } from 'react';
import { INSPIRATION_DESTINATIONS, INSPIRATION_CATEGORIES } from '../../data/inspirationData';

/**
 * Geometric constellation positions (viewBox: 0 0 1000 560)
 * Placed in harmonic clusters reflecting cultural and geographic rhythms
 * Carefully measured to avoid edge clipping and line entanglements.
 */
const NODE_COORDINATES = {
  'manali':    { x: 160, y: 150, pctX: 16.0, pctY: 26.8, regionName: 'Western Himalayas' },
  'jaipur':    { x: 310, y: 150, pctX: 31.0, pctY: 26.8, regionName: 'Rajputana Plains' },
  'new-delhi': { x: 470, y: 190, pctX: 47.0, pctY: 33.9, regionName: 'Imperial Axis' },
  'florence':  { x: 770, y: 150, pctX: 77.0, pctY: 26.8, regionName: 'Tuscan Valleys' },
  'kyoto':     { x: 860, y: 340, pctX: 86.0, pctY: 60.7, regionName: 'Kansai Basin' },
  'istanbul':  { x: 650, y: 280, pctX: 65.0, pctY: 50.0, regionName: 'Bosphorus Straits' },
  'mostar':    { x: 520, y: 420, pctX: 52.0, pctY: 75.0, regionName: 'Dinaric Alps' },
  'rishikesh': { x: 340, y: 440, pctX: 34.0, pctY: 78.6, regionName: 'Ganges Gorge' },
  'udaipur':   { x: 200, y: 350, pctX: 20.0, pctY: 62.5, regionName: 'Mewar Lakes' }
};

const CATEGORY_NAMES = {
  weekend: 'Weekend Escapes',
  mountain: 'Mountain Retreats',
  culture: 'Culture & Heritage',
  food: 'Food Journeys',
  romantic: 'Romantic Getaways',
  budget: 'Budget Adventures',
  hidden: 'Hidden Gems'
};

/**
 * Normalizes and checks if a destination matches a selected category.
 * Checks both category slugs (e.g. 'mountain', 'culture') and display labels (e.g. 'Mountain Retreats'),
 * dynamically mapped against canonical INSPIRATION_CATEGORIES.
 */
export function destinationMatchesCategory(dest, categoryKey) {
  if (!dest || !categoryKey || categoryKey === 'all') return true;
  const key = String(categoryKey).toLowerCase().trim();

  // 1. Direct match on categories array slugs (e.g. 'mountain', 'culture', 'food', 'weekend')
  if (Array.isArray(dest.categories) && dest.categories.some((c) => String(c).toLowerCase().trim() === key)) {
    return true;
  }

  // 2. Match on categoryLabels (e.g. 'Mountain Retreats', 'Food Journeys')
  if (Array.isArray(dest.categoryLabels)) {
    const matchesLabel = dest.categoryLabels.some((l) => {
      const labelClean = String(l).toLowerCase().trim();
      return labelClean === key || labelClean.includes(key);
    });
    if (matchesLabel) return true;
  }

  // 3. Fallback lookup in canonical INSPIRATION_CATEGORIES definitions
  const catDef = INSPIRATION_CATEGORIES.find(
    (c) => c.id.toLowerCase() === key || c.label.toLowerCase() === key || c.tag.toLowerCase() === key
  );
  if (catDef) {
    if (Array.isArray(dest.categories) && dest.categories.includes(catDef.id)) {
      return true;
    }
    if (Array.isArray(dest.categoryLabels)) {
      const tagLower = catDef.tag.toLowerCase();
      const labelLower = catDef.label.toLowerCase();
      if (dest.categoryLabels.some((l) => {
        const lLow = String(l).toLowerCase();
        return lLow === tagLower || lLow === labelLower;
      })) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Evaluates genuine data-backed thematic links between two destinations
 * Strictly derived from existing categories and interests in inspirationData.js
 * Strength = number of shared tags (categories + interests).
 * A connection exists only if destinations truly share at least 1 tag.
 */
export function getSharedThemes(destA, destB) {
  if (!destA || !destB || destA.id === destB.id) return null;

  const catsA = Array.isArray(destA.categories) ? destA.categories : [];
  const catsB = Array.isArray(destB.categories) ? destB.categories : [];
  const sharedCatKeys = catsA.filter((cat) => catsB.includes(cat));

  const interestsA = Array.isArray(destA.interests) ? destA.interests : [];
  const interestsB = Array.isArray(destB.interests) ? destB.interests : [];
  const sharedInterests = interestsA.filter((i) => interestsB.includes(i));

  const sharedCategoryLabels = (destA.categoryLabels || []).filter((label) =>
    (destB.categoryLabels || []).includes(label)
  );

  const sharedCategories =
    sharedCategoryLabels.length > 0
      ? sharedCategoryLabels
      : sharedCatKeys.map((k) => CATEGORY_NAMES[k] || k);

  const sharedTags = [...sharedCategories, ...sharedInterests];
  const strength = sharedCatKeys.length + sharedInterests.length;

  if (strength === 0) return null;

  let primaryLabel = '';
  if (sharedCategories.length > 0) {
    primaryLabel = `Connected through: ${sharedCategories.slice(0, 2).join(' & ')}`;
  } else {
    primaryLabel = `Shared interest: ${sharedInterests.slice(0, 2).join(' & ')}`;
  }

  return {
    destAId: destA.id,
    destBId: destB.id,
    sharedCategories,
    sharedInterests,
    sharedTags,
    primaryLabel,
    strength
  };
}

export default function StoryConstellation({
  selectedDestination,
  onSelectDestination,
  activeCategory = 'all',
  onSelectCategory,
  onOpenJourneyReel,
  onOpenLightbox,
  onPlan,
  isSaved,
  onToggleSave
}) {
  const [internalSelectedId, setInternalSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [internalActiveTheme, setInternalActiveTheme] = useState('all');
  const [isSceneLoaded, setIsSceneLoaded] = useState(false);
  const [isTheaterFading, setIsTheaterFading] = useState(false);
  const theaterRef = useRef(null);

  // Single source of truth with fallback
  const activeTheme = activeCategory || internalActiveTheme;
  const setActiveTheme = onSelectCategory || setInternalActiveTheme;

  const selectedId = selectedDestination?.id || internalSelectedId;
  const setSelectedId = (id, coords = null) => {
    if (onSelectDestination) {
      const dest = INSPIRATION_DESTINATIONS.find((d) => d.id === id) || null;
      onSelectDestination(dest, coords);
    }
    setInternalSelectedId(id);
  };

  // Trigger progressive cinematic scene reveal on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSceneLoaded(true);
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  // Dynamic category filters derived directly from INSPIRATION_CATEGORIES with live counts
  const themeFilters = useMemo(() => {
    return INSPIRATION_CATEGORIES.map((cat) => {
      const count = INSPIRATION_DESTINATIONS.filter((d) =>
        destinationMatchesCategory(d, cat.id)
      ).length;
      return {
        key: cat.id,
        label: cat.id === 'all' ? 'All Threads' : cat.label,
        count
      };
    });
  }, []);

  // Derive ALL and ONLY matching destinations from the actual dataset
  const visibleDestinations = useMemo(() => {
    return INSPIRATION_DESTINATIONS.filter((dest) =>
      destinationMatchesCategory(dest, activeTheme)
    );
  }, [activeTheme]);

  const visibleDestIds = useMemo(() => {
    return new Set(visibleDestinations.map((d) => d.id));
  }, [visibleDestinations]);

  // Compute all legitimate pairwise connections across the 9 destinations
  const allConnections = useMemo(() => {
    const list = [];
    const len = INSPIRATION_DESTINATIONS.length;

    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        const d1 = INSPIRATION_DESTINATIONS[i];
        const d2 = INSPIRATION_DESTINATIONS[j];
        const theme = getSharedThemes(d1, d2);
        const c1 = NODE_COORDINATES[d1.id];
        const c2 = NODE_COORDINATES[d2.id];

        if (theme && c1 && c2) {
          list.push({
            id: `${d1.id}-${d2.id}`,
            from: d1.id,
            to: d2.id,
            x1: c1.x,
            y1: c1.y,
            x2: c2.x,
            y2: c2.y,
            ...theme
          });
        }
      }
    }
    return list;
  }, []);

  // Active focus (either currently selected or hovered)
  const activeFocusId = selectedId || hoveredId;

  // Connections linked to active focus
  const activeConnections = useMemo(() => {
    if (!activeFocusId) return [];
    return allConnections.filter(
      (c) => c.from === activeFocusId || c.to === activeFocusId
    );
  }, [activeFocusId, allConnections]);

  // Set of partner destination IDs linked to the active focus
  const connectedPartnerIds = useMemo(() => {
    const set = new Set();
    activeConnections.forEach((c) => {
      set.add(c.from === activeFocusId ? c.to : c.from);
    });
    return set;
  }, [activeFocusId, activeConnections]);

  // Selected destination data record
  const selectedDest = useMemo(() => {
    return INSPIRATION_DESTINATIONS.find((d) => d.id === selectedId) || null;
  }, [selectedId]);

  // Connected stories for the selected destination
  const selectedConnectedStories = useMemo(() => {
    if (!selectedDest) return [];
    const connectionsForSelected = allConnections.filter(
      (c) => c.from === selectedDest.id || c.to === selectedDest.id
    );

    return connectionsForSelected
      .map((c) => {
        const partnerId = c.from === selectedDest.id ? c.to : c.from;
        const partnerDest = INSPIRATION_DESTINATIONS.find((d) => d.id === partnerId);
        return {
          destination: partnerDest,
          reason: c.primaryLabel,
          categories: c.sharedCategories,
          interests: c.sharedInterests
        };
      })
      .filter((item) => Boolean(item.destination));
  }, [selectedDest, allConnections]);

  // Smooth selection handler with brief camera transition
  const handleSelectNode = (destId, event = null) => {
    if (selectedId === destId) {
      setSelectedId(null);
      return;
    }
    let coords = null;
    if (event) {
      if (typeof event.clientX === 'number') {
        coords = { clientX: event.clientX, clientY: event.clientY };
      } else if (event.currentTarget && event.currentTarget.getBoundingClientRect) {
        const r = event.currentTarget.getBoundingClientRect();
        coords = { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
      }
    }
    setIsTheaterFading(true);
    setTimeout(() => {
      setSelectedId(destId, coords);
      setIsTheaterFading(false);
    }, 150);
  };

  // "Surprise Me" action: Selects an existing destination different from the current
  const handleSurpriseMe = () => {
    const available = INSPIRATION_DESTINATIONS.filter((d) => d.id !== selectedId);
    if (available.length > 0) {
      const randomDest = available[Math.floor(Math.random() * available.length)];
      handleSelectNode(randomDest.id);
    }
  };

  // "Follow This Thread" action: Steps to the first connected partner
  const handleFollowThread = () => {
    if (!selectedConnectedStories || selectedConnectedStories.length === 0) return;
    const nextPartner = selectedConnectedStories[0].destination;
    if (nextPartner) {
      handleSelectNode(nextPartner.id);
    }
  };

  return (
    <section
      className={`constellation-cinematic-section ${isSceneLoaded ? 'scene-ready' : ''}`}
      aria-label="Dastaan Story Constellation"
    >
      <div className="insp-container">
        {/* Constellation Editorial Header */}
        <header className="constellation-header text-center">
          <div className="constellation-kicker-row">
            <span className="constellation-star-glyph">✦</span>
            <span className="constellation-eyebrow">DASTAAN STORY CONSTELLATION</span>
            <span className="constellation-star-glyph">✦</span>
          </div>

          <h2 className="constellation-title">
            Threads of Culture, Rhythm & Atmosphere
          </h2>

          <p className="constellation-desc">
            Explore how nine curated journeys across continents weave together through shared architectural heritage,
            culinary pathways, and mountain sanctuaries. Select any star to step into its cinematic world.
          </p>

          {/* Serendipity Action Bar */}
          <div className="constellation-controls-bar">
            <button
              type="button"
              className="btn-constellation-surprise"
              onClick={handleSurpriseMe}
              title="Serendipitous journey selection"
            >
              <span>✦ SURPRISE ME</span>
            </button>
          </div>
        </header>

        {/* The Constellation Stage Viewport */}
        <div
          className={`constellation-stage ${selectedDest ? 'has-focus-active' : ''}`}
          role="region"
          aria-label="Interactive Constellation Map"
        >
          {/* Layer 1: Ambient Background & Celestial Lighting */}
          <div className="constellation-celestial-bg" aria-hidden="true">
            <div className="celestial-nebula" />
            <div className="celestial-orbit orbit-outer" />
            <div className="celestial-orbit orbit-inner" />
            <div className="celestial-radial-glow" />
            <div className="celestial-stardust" />
          </div>

          {/* Layer 2: Animated Golden Connection Web */}
          <svg
            className="constellation-svg"
            viewBox="0 0 1000 560"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="goldLineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D8B45A" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#FAF7EF" stopOpacity="0.4" />
              </linearGradient>

              <linearGradient id="activeGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FAF7EF" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#D8B45A" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#C87955" stopOpacity="0.85" />
              </linearGradient>

              <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Render Connection Lines */}
            {allConnections.map((conn) => {
              const isMatchTheme =
                activeTheme === 'all' ||
                conn.sharedCategories.some((c) =>
                  c.toLowerCase().includes(activeTheme.toLowerCase())
                );

              const isLinkedToActive =
                activeFocusId && (conn.from === activeFocusId || conn.to === activeFocusId);

              let lineClass = 'constellation-line';
              if (selectedDest) {
                lineClass += isLinkedToActive ? ' line-focus-lit' : ' line-focus-hidden';
              } else if (activeFocusId) {
                lineClass += isLinkedToActive ? ' line-highlight' : ' line-dimmed';
              } else if (!isMatchTheme) {
                lineClass += ' line-dimmed';
              } else {
                lineClass += ' line-default';
              }

              return (
                <line
                  key={conn.id}
                  x1={conn.x1}
                  y1={conn.y1}
                  x2={conn.x2}
                  y2={conn.y2}
                  className={lineClass}
                  stroke={isLinkedToActive ? 'url(#activeGoldGrad)' : 'url(#goldLineGrad)'}
                  strokeWidth={isLinkedToActive ? 2.5 : 1.2}
                  filter={isLinkedToActive ? 'url(#goldGlow)' : undefined}
                />
              );
            })}
          </svg>

          {/* Layer 3: Interactive Destination Stars */}
          <div className="constellation-nodes-layer">
            {INSPIRATION_DESTINATIONS.map((dest, idx) => {
              const coord = NODE_COORDINATES[dest.id];
              if (!coord) return null;

              const isSelected = selectedId === dest.id;
              const isHovered = hoveredId === dest.id;
              const isConnectedToFocus = connectedPartnerIds.has(dest.id);
              const matchesTheme =
                activeTheme === 'all' ||
                (dest.categories || []).includes(activeTheme) ||
                destinationMatchesCategory(dest, activeTheme);

              let nodeClass = 'constellation-node';
              if (isSelected) nodeClass += ' is-selected';
              if (isHovered) nodeClass += ' is-hovered';
              if (isConnectedToFocus) nodeClass += ' is-partner';
              if (selectedDest && !isSelected && !isConnectedToFocus) nodeClass += ' is-backgrounded';
              if (!matchesTheme && !isSelected && !isConnectedToFocus) nodeClass += ' is-dimmed';

              return (
                <div
                  key={dest.id}
                  className={nodeClass}
                  style={{
                    left: `${coord.pctX}%`,
                    top: `${coord.pctY}%`,
                    '--node-idx': idx
                  }}
                >
                  <button
                    type="button"
                    className="constellation-node-btn"
                    onClick={(e) => handleSelectNode(dest.id, e)}
                    onMouseEnter={() => setHoveredId(dest.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onFocus={() => setHoveredId(dest.id)}
                    onBlur={() => setHoveredId(null)}
                    aria-pressed={isSelected}
                    aria-label={`${dest.name}, ${dest.country}. ${
                      isConnectedToFocus ? 'Thematically connected.' : 'Select to enter story.'
                    }`}
                  >
                    <div className="node-photo-shell">
                      <img
                        src={dest.heroImage}
                        alt=""
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = '/images/jaipur/amerfortandasheeshmahal.jpg';
                        }}
                      />
                      <span className="node-orbital-ring" />
                      <span className="node-star-glint" />
                    </div>

                    <div className="node-label-wrap">
                      <span className="node-dest-title">{dest.name}</span>
                      <span className="node-country-sub">{dest.country}</span>
                    </div>
                  </button>

                  {/* Contextual Single Tooltip on Hover (When Not in Theater View) */}
                  {!selectedDest && hoveredId === dest.id && (
                    <div className="constellation-node-tooltip" role="tooltip">
                      <span className="tooltip-indicator">✦ DISCOVER STORY</span>
                      <span className="tooltip-text">
                        {dest.name} · {dest.categoryLabels?.[0] || dest.region}
                      </span>
                    </div>
                  )}

                  {!selectedDest && hoveredId && isConnectedToFocus && (
                    <div className="constellation-node-tooltip tooltip-connection" role="tooltip">
                      <span className="tooltip-indicator">✦ THEMATIC THREAD</span>
                      <span className="tooltip-text">
                        {
                          activeConnections.find(
                            (c) => c.from === dest.id || c.to === dest.id
                          )?.primaryLabel
                        }
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* =================================================================
              Layer 4: THE CINEMATIC STORY THEATER (Directly inside the canvas)
             ================================================================= */}
          {selectedDest && (
            <div
              ref={theaterRef}
              className={`constellation-theater-overlay ${isTheaterFading ? 'fading' : 'active'}`}
              role="dialog"
              aria-modal="true"
              aria-label={`Cinematic preview: ${selectedDest.name}`}
            >
              {/* Theater Ambient Backdrop */}
              <div
                className="theater-backdrop"
                onClick={() => setSelectedId(null)}
                aria-hidden="true"
              />

              {/* Theater Main Frame */}
              <div className="theater-content-frame">
                {/* Visual Media Column */}
                <div className="theater-media-col">
                  <div className="theater-img-wrap">
                    <img
                      src={selectedDest.heroImage}
                      alt={`${selectedDest.name}, ${selectedDest.region}`}
                      className="theater-hero-img"
                    />
                    <div className="theater-img-shading" />
                    <div className="theater-gold-accent-border" />

                    <div className="theater-img-overlay-meta">
                      <span className="theater-category-badge">
                        {selectedDest.categoryLabels?.[0] || 'Signature Journey'}
                      </span>
                      <span className="theater-location-badge">
                        {selectedDest.region}, {selectedDest.country}
                      </span>
                    </div>
                  </div>

                  {/* Quick Metrics Bar */}
                  <div className="theater-metrics-row">
                    <div className="theater-metric">
                      <span className="metric-lbl">DURATION</span>
                      <span className="metric-val">{selectedDest.durationText}</span>
                    </div>
                    <div className="theater-metric">
                      <span className="metric-lbl">BUDGET ESTIMATE</span>
                      <span className="metric-val">{selectedDest.budgetRange}</span>
                    </div>
                    <div className="theater-metric">
                      <span className="metric-lbl">STYLE</span>
                      <span className="metric-val">{selectedDest.travelStyle || 'Balanced'}</span>
                    </div>
                  </div>
                </div>

                {/* Editorial Narrative Column */}
                <div className="theater-editorial-col">
                  <div className="theater-header-row">
                    <span className="theater-eyebrow">
                      CONSTELLATION FOCUS · {selectedDest.region}, {selectedDest.country}
                    </span>
                    <button
                      type="button"
                      className="theater-close-btn"
                      onClick={() => setSelectedId(null)}
                      aria-label="Back to constellation map (Esc)"
                    >
                      &times;
                    </button>
                  </div>

                  <h3 className="theater-title">{selectedDest.name}</h3>
                  <p className="theater-tagline">"{selectedDest.tagline}"</p>

                  <div className="theater-divider-line" />

                  <p className="theater-narrative-text">
                    {selectedDest.editorialNarrative || selectedDest.description}
                  </p>

                  {/* Curated Highlights Bullets */}
                  {selectedDest.highlights && selectedDest.highlights.length > 0 && (
                    <div className="theater-highlights-box">
                      <span className="theater-subheading">SIGNATURE SIGHTS:</span>
                      <ul className="theater-highlights-list">
                        {selectedDest.highlights.slice(0, 2).map((h, i) => (
                          <li key={i}>
                            <span className="bullet-diamond">&#9670;</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Shared Constellation Connections */}
                  {selectedConnectedStories.length > 0 && (
                    <div className="theater-threads-box">
                      <span className="theater-subheading">
                        ✦ THEMATIC CONNECTIONS ({selectedConnectedStories.length}):
                      </span>
                      <div className="theater-threads-pills">
                        {selectedConnectedStories.map(({ destination: partner, reason }, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="theater-thread-pill"
                            onClick={() => handleSelectNode(partner.id)}
                            title={`Follow thread to ${partner.name}`}
                          >
                            <span className="pill-partner-name">{partner.name}</span>
                            <span className="pill-partner-reason">{reason.replace('Connected through: ', '').replace('Shared interest: ', '')}</span>
                            <span className="pill-arrow">&rarr;</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Working Action Buttons */}
                  <div className="theater-actions-bar">
                    <button
                      type="button"
                      className="btn-theater-primary-reel"
                      onClick={(e) => {
                        const panel = e.currentTarget.closest('.constellation-theater');
                        const img = panel?.querySelector('.theater-cover-frame');
                        const rect = (img || e.currentTarget).getBoundingClientRect();
                        const plainRect = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
                        if (onOpenJourneyReel) {
                          onOpenJourneyReel(selectedDest, plainRect);
                        } else if (onSelectDestination) {
                          onSelectDestination(selectedDest);
                        }
                      }}
                    >
                      STEP INSIDE THIS JOURNEY &rarr;
                    </button>

                    {selectedConnectedStories.length > 0 && (
                      <button
                        type="button"
                        className="btn-theater-thread"
                        onClick={handleFollowThread}
                        title={`Follow thread to ${selectedConnectedStories[0].destination.name}`}
                      >
                        FOLLOW THIS THREAD ✦
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-theater-back"
                      onClick={() => setSelectedId(null)}
                    >
                      BACK TO CONSTELLATION
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
