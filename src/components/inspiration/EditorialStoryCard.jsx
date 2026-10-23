import React, { useState } from 'react';

export default function EditorialStoryCard({
  destination,
  onPlan,
  isSaved,
  onToggleSave,
  onOpenLightbox,
  onOpenJourneyReel
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="insp-editorial-card" aria-label={`Story: ${destination.name}`}>
      {/* Visual Cover Wrap */}
      <div
        className="insp-card-image-wrap"
        onClick={(e) => {
          if (!onOpenJourneyReel) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const plainRect = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
          onOpenJourneyReel(destination, plainRect);
        }}
        style={{ cursor: onOpenJourneyReel ? 'pointer' : 'default' }}
        title={onOpenJourneyReel ? `Step inside the ${destination.name} Journey Reel` : undefined}
      >
        <div className="insp-badge-row">
          {destination.categoryLabels?.[0] && (
            <span className="insp-category-badge">{destination.categoryLabels[0]}</span>
          )}
          {onOpenJourneyReel && (
            <span className="insp-reel-pill">JOURNEY REEL ✦</span>
          )}
        </div>

        <img
          src={imgError ? '/images/jaipur/hawamahal.jpg' : destination.heroImage}
          alt={`${destination.name}, ${destination.region}`}
          onError={() => {
            console.warn(`[EditorialStoryCard] Failed to load heroImage for ${destination.name}: ${destination.heroImage}`);
            setImgError(true);
          }}
          loading="lazy"
        />
      </div>

      {/* Editorial Content */}
      <div className="insp-card-body">
        <span className="insp-region-label">{destination.region}, {destination.country}</span>
        <h3 className="insp-card-title">{destination.name}</h3>
        <p className="insp-card-tagline">"{destination.tagline}"</p>
        <p className="insp-card-desc">{destination.description}</p>

        {/* Category Pills */}
        <div className="insp-pills-row">
          {destination.categoryLabels?.map((label, idx) => (
            <span key={idx} className="insp-pill-tag">{label}</span>
          ))}
        </div>

        {/* Story Vignette Strip (Inspectable Photo Highlights) */}
        {destination.vignettes && destination.vignettes.length > 0 && (
          <div className="insp-vignettes-wrap">
            <span className="insp-vignette-label">HIGHLIGHT VIGNETTES (CLICK TO ENLARGE)</span>
            <div className="insp-vignette-thumbs">
              {destination.vignettes.map((vig, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="insp-vignette-thumb"
                  title={`View ${vig.title}`}
                  onClick={() => onOpenLightbox({
                    title: vig.title,
                    desc: vig.desc,
                    cat: vig.cat,
                    destBadge: `${destination.name}, ${destination.country}`,
                    imgSrc: vig.image,
                    imgLabel: vig.title.toUpperCase()
                  })}
                >
                  <img
                    src={vig.image}
                    alt={vig.title}
                    loading="lazy"
                    onError={(e) => {
                      console.warn(`[EditorialStoryCard] Failed to load vignette '${vig.title}' for ${destination.name}: ${vig.image}`);
                      if (destination.heroImage && e.target.src !== destination.heroImage) {
                        e.target.src = destination.heroImage;
                      } else {
                        e.target.src = '/images/jaipur/hawamahal.jpg';
                      }
                    }}
                  />
                  <span className="thumb-inspect-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer & Actions */}
        <div className="insp-card-footer">
          <div className="insp-card-meta">
            <span className="insp-duration-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline-block', verticalAlign: '-1px', marginRight: '6px' }}>
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              {destination.durationText}
            </span>
            <div className="insp-budget-wrap">
              <span className="insp-budget-val">{destination.budgetRange}</span>
              <span className="insp-budget-sub">Indicative estimate</span>
            </div>
          </div>

          <div className="insp-card-actions">
            {onOpenJourneyReel && (
              <button
                type="button"
                className="btn-reel-card-trigger"
                onClick={(e) => {
                  const cardEl = e.currentTarget.closest('.insp-editorial-card');
                  const imgWrap = cardEl?.querySelector('.insp-card-image-wrap');
                  const rect = (imgWrap || e.currentTarget).getBoundingClientRect();
                  const plainRect = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
                  onOpenJourneyReel(destination, plainRect);
                }}
                title={`Step inside the ${destination.name} Journey Reel`}
              >
                STEP INSIDE &rarr;
              </button>
            )}

            <button
              type="button"
              className="btn-plan-story"
              onClick={() => onPlan(destination)}
              style={{ flex: 1 }}
            >
              PLAN THIS TRIP &rarr;
            </button>

            <button
              type="button"
              className={`btn-save-story ${isSaved ? 'saved' : ''}`}
              onClick={() => onToggleSave(destination)}
              aria-label={isSaved ? `Remove ${destination.name} from saved` : `Save ${destination.name}`}
            >
              <span>{isSaved ? '✓ SAVED' : '♡ SAVE'}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
