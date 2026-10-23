import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * ThresholdTransition Component
 * 
 * Signature Cinematic Doorway camera push transition into the 4-Chapter Journey Reel:
 * - Starts from the real getBoundingClientRect of the Stage photo (or clicked archive card photo)
 * - Morphs into an Arch doorway with gold hairline stroke
 * - Camera pushes through: photo expands to full viewport while photo inside scales
 * - Warm cream-gold radial light bloom dissolves into deep forest green
 * - Large cinematic serif title card reveals with tightening letter-spacing
 * - 150ms skip on click / Esc / any key
 * - Remembers session to play compact version on subsequent opens
 * - Sits above the navbar (z-index: 2500) and locks body scroll
 */
export default function ThresholdTransition({
  isOpen,
  destination,
  originRect,
  onComplete,
  onClose
}) {
  const [phase, setPhase] = useState('start'); // 'start' | 'push' | 'bloom' | 'title'
  const [isSkipping, setIsSkipping] = useState(false);
  const [targetRect, setTargetRect] = useState(null);

  const timersRef = useRef([]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
  }, []);

  // Safe skip handler that fires within 150ms
  const handleSkip = useCallback(() => {
    if (isSkipping) return;
    setIsSkipping(true);
    clearAllTimers();

    const t = setTimeout(() => {
      onComplete && onComplete();
    }, 150);
    timersRef.current.push(t);
  }, [clearAllTimers, isSkipping, onComplete]);

  // Body scroll lock while transition is active
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow || '';
    };
  }, [isOpen]);

  // Keyboard navigation: Escape or any key triggers skip
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleSkip]);

  // Main Choreographed Animation Sequence
  useEffect(() => {
    if (!isOpen || !destination) {
      setPhase('start');
      setIsSkipping(false);
      clearAllTimers();
      return;
    }

    // Check user reduced motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      onComplete && onComplete();
      return;
    }

    // Determine if this is the first open in this session
    const isFirstTime = typeof sessionStorage !== 'undefined'
      ? !sessionStorage.getItem('dastaan_threshold_seen')
      : true;

    if (isFirstTime && typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem('dastaan_threshold_seen', 'true');
      } catch {
        // Ignore storage exceptions
      }
    }

    // Set initial geometry from originRect or fallback to centered stage
    const initialRect = originRect || {
      top: Math.round(window.innerHeight * 0.2),
      left: Math.round(window.innerWidth * 0.1),
      width: Math.round(window.innerWidth * 0.8),
      height: Math.round(window.innerHeight * 0.6)
    };

    setTargetRect(initialRect);
    setPhase('start');
    setIsSkipping(false);

    if (isFirstTime) {
      // FULL 2.1s TIMELINE:
      // 0-40ms: Mount at initial rect with arch top
      // 50ms: Push camera through doorway -> expand to 100vw, 100vh
      const t1 = setTimeout(() => {
        setTargetRect({
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight
        });
        setPhase('push');
      }, 50);

      // 850ms: Warm cream-gold light bloom peak
      const t2 = setTimeout(() => {
        setPhase('bloom');
      }, 850);

      // 1050ms: Serif title card reveals
      const t3 = setTimeout(() => {
        setPhase('title');
      }, 1050);

      // 2100ms: Finish and open Journey Reel
      const t4 = setTimeout(() => {
        onComplete && onComplete();
      }, 2100);

      timersRef.current.push(t1, t2, t3, t4);
    } else {
      // COMPACT 1.1s SUBSEQUENT OPEN TIMELINE:
      const t1 = setTimeout(() => {
        setTargetRect({
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight
        });
        setPhase('push');
      }, 30);

      const t2 = setTimeout(() => {
        setPhase('title');
      }, 450);

      const t3 = setTimeout(() => {
        onComplete && onComplete();
      }, 1150);

      timersRef.current.push(t1, t2, t3);
    }

    return () => {
      clearAllTimers();
    };
  }, [isOpen, destination, originRect, clearAllTimers, onComplete]);

  if (!isOpen || !destination) return null;

  const archStyle = targetRect
    ? {
        top: `${targetRect.top}px`,
        left: `${targetRect.left}px`,
        width: `${targetRect.width}px`,
        height: `${targetRect.height}px`
      }
    : {
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh'
      };

  const originX = originRect ? originRect.left + originRect.width / 2 : window.innerWidth / 2;
  const originY = originRect ? originRect.top + originRect.height / 2 : window.innerHeight / 2;

  return (
    <div
      className={`threshold-overlay ${isSkipping ? 'threshold-skipping' : ''}`}
      style={{ '--threshold-origin-x': `${originX}px`, '--threshold-origin-y': `${originY}px` }}
      onClick={handleSkip}
      role="dialog"
      aria-modal="true"
      aria-label={`Entering Journey Reel for ${destination.name}`}
    >
      {/* Deep forest green underlay sitting above navbar */}
      <div className="threshold-backdrop" />
      <div className={`threshold-sparkle-wave ${phase === 'push' || phase === 'bloom' || phase === 'title' ? 'sparkle-wave-active' : ''}`} aria-hidden="true" />

      {/* Expanding Archway Doorway Portal */}
      <div
        className={`threshold-arch-portal stage-${phase}`}
        style={archStyle}
      >
        {/* Scaling Hero Photo */}
        <div
          className={`threshold-photo ${phase === 'push' || phase === 'bloom' || phase === 'title' ? 'photo-zoomed' : ''}`}
          style={{ backgroundImage: `url(${destination.heroImage || destination.image})` }}
        />

        {/* Arch Hairline Gold Stroke */}
        <div className="threshold-arch-stroke" aria-hidden="true" />

        {/* Warm Cream-Gold Light Bloom */}
        <div
          className={`threshold-light-bloom ${phase === 'bloom' || phase === 'title' ? 'bloom-active' : ''}`}
          aria-hidden="true"
        />

        {/* Cinematic Forest Gradient Over Photo */}
        <div
          className={`threshold-vignette ${phase === 'title' ? 'vignette-active' : ''}`}
        />

        {/* Large Cinematic Serif Title Card */}
        <div
          className={`threshold-title-card ${phase === 'title' ? 'title-visible' : ''}`}
        >
          <span className="threshold-kicker">
            {destination.region} · {destination.country}
          </span>
          <h1 className="threshold-title">{destination.name}</h1>
          {destination.tagline && (
            <p className="threshold-tagline">"{destination.tagline}"</p>
          )}
          <div className="threshold-loading-line">
            <span className="threshold-loading-progress" />
          </div>
        </div>
      </div>

      {/* Skip Button Affordance */}
      <button
        type="button"
        className="threshold-skip-btn"
        onClick={(e) => {
          e.stopPropagation();
          handleSkip();
        }}
        aria-label="Skip cinematic introduction (Esc)"
      >
        <span>SKIP INTRO (ESC)</span>
        <span className="skip-glyph" aria-hidden="true">&rarr;</span>
      </button>
    </div>
  );
}
