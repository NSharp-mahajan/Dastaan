import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

/**
 * DestinationStage Component
 * 
 * The signature editorial stage displaying the currently selected destination.
 * Features:
 * - Circle clip-path reveal blooming from the clicked orb's local percentage coordinates
 * - Word-by-word rising serif title behind overflow masks
 * - Three honest highlight vignettes triggering LightboxModal
 * - Filled gold "Step Inside This Journey" button triggering Journey Reel
 * - "Plan this trip" link and bookmark save toggle
 * - 500ms input lock to prevent rapid overlapping animations
 */
export default function DestinationStage({
  destination,
  originCoords,
  onStepInside,
  onPlan,
  isSaved = false,
  onToggleSave,
  onOpenLightbox
}) {
  const photoFrameRef = useRef(null);
  const inputLockRef = useRef(false);

  // Active & previous destination records for smooth crossfade and clip-path morph
  const [activeDest, setActiveDest] = useState(destination);
  const [previousDest, setPreviousDest] = useState(destination);

  // Animation states
  const [isRevealing, setIsRevealing] = useState(false);
  const [clipCenter, setClipCenter] = useState({ x: 50, y: 50 });
  const [isTitleVisible, setIsTitleVisible] = useState(true);

  // Compute local percentage coordinates from clicked orb viewport coordinates
  const calculateLocalOrigin = useCallback((coords) => {
    if (!coords || !photoFrameRef.current) {
      return { x: 50, y: 50 };
    }

    try {
      const rect = photoFrameRef.current.getBoundingClientRect();
      const clientX = coords.clientX ?? (coords.left ? coords.left + coords.width / 2 : null);
      const clientY = coords.clientY ?? (coords.top ? coords.top + coords.height / 2 : null);

      if (clientX == null || clientY == null) {
        return { x: 50, y: 50 };
      }

      const localX = clientX - rect.left;
      const localY = clientY - rect.top;

      const pctX = Math.min(Math.max(Math.round((localX / rect.width) * 100), 0), 100);
      const pctY = Math.min(Math.max(Math.round((localY / rect.height) * 100), 0), 100);

      return { x: pctX, y: pctY };
    } catch {
      return { x: 50, y: 50 };
    }
  }, []);

  // Trigger circle clip-path reveal when destination prop changes
  useEffect(() => {
    if (!destination || destination.id === activeDest?.id) return;

    // 500ms input lock
    if (inputLockRef.current) return;
    inputLockRef.current = true;
    setTimeout(() => {
      inputLockRef.current = false;
    }, 500);

    const origin = calculateLocalOrigin(originCoords);
    setClipCenter(origin);

    // Preload next image to eliminate flickering
    const img = new Image();
    img.src = destination.heroImage;

    // Start reveal sequence: hide title, set previous, then bloom incoming circle
    setIsTitleVisible(false);
    setPreviousDest(activeDest);
    setActiveDest(destination);

    // Give browser one frame to mount the initial clip-path at 0%
    const animTimer = setTimeout(() => {
      setIsRevealing(true);
    }, 20);

    // When the circle is ~70% open (~450ms), reveal the word-by-word rising title
    const titleTimer = setTimeout(() => {
      setIsTitleVisible(true);
    }, 400);

    // Complete reveal at 720ms
    const endTimer = setTimeout(() => {
      setIsRevealing(false);
      setPreviousDest(destination);
    }, 720);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(titleTimer);
      clearTimeout(endTimer);
    };
  }, [destination, originCoords, calculateLocalOrigin, activeDest]);

  // Words array for word-by-word rising typography
  const titleWords = useMemo(() => {
    if (!activeDest?.name) return [];
    return activeDest.name.split(' ');
  }, [activeDest?.name]);

  if (!activeDest) return null;

  return (
    <section className="destination-stage-section" aria-label={`Featured Journey: ${activeDest.name}`}>
      <div className="insp-container">
        <div className="stage-editorial-card">

          {/* =============================================================
              LEFT COLUMN: PHOTO FRAME WITH CIRCLE CLIP-PATH REVEAL
             ============================================================= */}
          <div className="stage-media-col">
            <div
              ref={photoFrameRef}
              className="stage-photo-frame"
              role="img"
              aria-label={`${activeDest.name}, ${activeDest.region}, ${activeDest.country}`}
            >
              {/* Previous Background Photo (Scales 1.0 -> 1.04 and darkens) */}
              {previousDest && previousDest.id !== activeDest.id && (
                <div
                  className={`stage-photo-layer layer-previous ${isRevealing ? 'is-animating' : ''}`}
                  style={{ backgroundImage: `url(${previousDest.heroImage})` }}
                  aria-hidden="true"
                />
              )}

              {/* Incoming Photo (Expands via circle clip-path from clicked orb coordinates) */}
              <div
                className={`stage-photo-layer layer-incoming ${isRevealing ? 'is-expanded' : 'is-initial'}`}
                style={{
                  backgroundImage: `url(${activeDest.heroImage})`,
                  '--clip-origin-x': `${clipCenter.x}%`,
                  '--clip-origin-y': `${clipCenter.y}%`
                }}
              />

              {/* Atmospheric Darkening Gradient */}
              <div className="stage-photo-shading" aria-hidden="true" />
              <div className="stage-photo-gold-border" aria-hidden="true" />

              {/* Badges on Photo */}
              <div className="stage-photo-overlay-badges">
                <span className="stage-badge-category">
                  {activeDest.categoryLabels?.[0] || 'Signature Journey'}
                </span>
                <span className="stage-badge-duration">
                  {activeDest.durationText || '3 Days'} · {activeDest.budgetRange || 'Indicative Budget'}
                </span>
              </div>
            </div>
          </div>

          {/* =============================================================
              RIGHT COLUMN: EDITORIAL NARRATIVE & ACTIONS
             ============================================================= */}
          <div className="stage-narrative-col">
            {/* Kicker: Region & Country */}
            <div className="stage-kicker-row">
              <span className="stage-kicker-glyph">✦</span>
              <span className="stage-kicker-text">
                {activeDest.region ? `${activeDest.region}, ${activeDest.country}` : activeDest.country}
              </span>
            </div>

            {/* Rising Word-by-Word Title */}
            <h2 className="stage-title">
              {titleWords.map((word, idx) => (
                <span key={`${word}-${idx}`} className="stage-title-word-mask">
                  <span
                    className={`stage-title-word ${isTitleVisible ? 'word-visible' : 'word-hidden'}`}
                    style={{ transitionDelay: `${idx * 60}ms` }}
                  >
                    {word}
                  </span>
                  {idx < titleWords.length - 1 && '\u00A0'}
                </span>
              ))}
            </h2>

            {/* Italic Quote Tagline */}
            {activeDest.tagline && (
              <p className="stage-quote">
                &ldquo;{activeDest.tagline}&rdquo;
              </p>
            )}

            {/* Editorial Narrative */}
            <p className="stage-narrative-text">
              {activeDest.editorialNarrative || activeDest.description}
            </p>

            {/* =============================================================
                THREE HONEST HIGHLIGHT VIGNETTES
               ============================================================= */}
            {Array.isArray(activeDest.vignettes) && activeDest.vignettes.length > 0 && (
              <div className="stage-vignettes-section">
                <span className="stage-vignettes-heading">HONEST HIGHLIGHTS & SIGHTS</span>
                <div className="stage-vignettes-grid">
                  {activeDest.vignettes.slice(0, 3).map((vig, idx) => (
                    <button
                      key={vig.title || idx}
                      type="button"
                      className="stage-vignette-card"
                      onClick={() =>
                        onOpenLightbox &&
                        onOpenLightbox({
                          image: vig.image,
                          title: vig.title,
                          subtitle: `${activeDest.name} · ${vig.cat || 'Highlight'}`,
                          description: vig.desc
                        })
                      }
                      title={`View ${vig.title} in photo lightbox`}
                    >
                      <div className="stage-vignette-thumb-wrap">
                        <img
                          src={vig.image}
                          alt={vig.title}
                          className="stage-vignette-thumb"
                          loading="lazy"
                        />
                        <span className="stage-vignette-zoom-icon" aria-hidden="true">⤢</span>
                      </div>
                      <div className="stage-vignette-info">
                        <span className="stage-vignette-cat">{vig.cat || 'MOMENT'}</span>
                        <span className="stage-vignette-title">{vig.title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* =============================================================
                ACTION BAR: "STEP INSIDE", "PLAN THIS TRIP", SAVE TOGGLE
               ============================================================= */}
            <div className="stage-actions-bar">
              {/* Primary Filled Gold Button */}
              <button
                type="button"
                className="btn-stage-step-inside"
                onClick={() => {
                  const rect = photoFrameRef.current?.getBoundingClientRect() || null;
                  const plainRect = rect
                    ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
                    : null;
                  onStepInside && onStepInside(activeDest, plainRect);
                }}
              >
                <span>STEP INSIDE THIS JOURNEY</span>
                <span className="btn-arrow" aria-hidden="true">&rarr;</span>
              </button>

              {/* Quiet "Plan this trip" link */}
              <button
                type="button"
                className="btn-stage-plan"
                onClick={() => onPlan && onPlan(activeDest)}
              >
                Plan this trip &rarr;
              </button>

              {/* Bookmark Save Button */}
              <button
                type="button"
                className={`btn-stage-save ${isSaved ? 'is-saved' : ''}`}
                onClick={() => onToggleSave && onToggleSave(activeDest)}
                aria-label={isSaved ? `Remove ${activeDest.name} from saved` : `Save ${activeDest.name}`}
                title={isSaved ? 'Saved in your travel archive' : 'Save to travel archive'}
              >
                <svg
                  className="stage-save-icon"
                  viewBox="0 0 24 24"
                  fill={isSaved ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                <span className="save-btn-text">{isSaved ? 'Saved' : 'Save'}</span>
              </button>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
