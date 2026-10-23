import React, { useState } from 'react';

export default function SpotlightStoryCard({
  destination,
  onPlan,
  isSaved,
  onToggleSave
}) {
  const [imgError, setImgError] = useState(false);

  if (!destination) return null;

  return (
    <article className="insp-spotlight-card" aria-label={`Featured Journey: ${destination.name}`}>
      <div className="insp-spotlight-media">
        <div className="insp-badge-row">
          <span className="insp-spotlight-badge">FEATURED STORY</span>
          {destination.categoryLabels?.[0] && (
            <span className="insp-category-badge">{destination.categoryLabels[0]}</span>
          )}
        </div>

        <img
          src={imgError ? '/images/jaipur/amerfortandasheeshmahal.jpg' : destination.heroImage}
          alt={`${destination.name}, ${destination.region}`}
          onError={() => {
            console.warn(`[SpotlightStoryCard] Failed to load heroImage for ${destination.name}: ${destination.heroImage}`);
            setImgError(true);
          }}
          loading="lazy"
        />
      </div>

      <div className="insp-spotlight-content">
        <span className="insp-region-label">{destination.region}, {destination.country}</span>
        <h2 className="insp-spotlight-title">{destination.name}</h2>
        <p className="insp-story-tagline">"{destination.tagline}"</p>
        <p className="insp-story-desc">{destination.editorialNarrative || destination.description}</p>

        {/* Highlights Checklist */}
        {destination.highlights && destination.highlights.length > 0 && (
          <ul className="insp-highlights-list" aria-label="Curated journey highlights">
            {destination.highlights.map((item, idx) => (
              <li key={idx}>
                <span className="insp-check-icon" aria-hidden="true">&#10003;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Indicative Metadata */}
        <div className="insp-meta-strip">
          <div className="insp-meta-item">
            <span className="insp-meta-label">SUGGESTED PACE</span>
            <span className="insp-meta-val">{destination.durationText}</span>
            <span className="insp-meta-sub">Curated daily schedule</span>
          </div>
          <div className="insp-meta-item">
            <span className="insp-meta-label">ESTIMATED BUDGET</span>
            <span className="insp-meta-val">{destination.budgetRange}</span>
            <span className="insp-meta-sub">Indicative estimate per traveler</span>
          </div>
        </div>

        {/* Prominent Actions */}
        <div className="insp-card-actions">
          <button
            type="button"
            className="btn-plan-story"
            onClick={() => onPlan(destination)}
          >
            PLAN THIS TRIP &rarr;
          </button>

          <button
            type="button"
            className={`btn-save-story ${isSaved ? 'saved' : ''}`}
            onClick={() => onToggleSave(destination)}
            aria-label={isSaved ? `Remove ${destination.name} from saved` : `Save ${destination.name} journey`}
          >
            <span>{isSaved ? '✓ SAVED' : '♡ SAVE JOURNEY'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
