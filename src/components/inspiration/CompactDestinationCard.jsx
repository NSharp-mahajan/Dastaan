import React, { useState } from 'react';

export default function CompactDestinationCard({
  destination,
  onPlan,
  isSaved,
  onToggleSave
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="insp-compact-card" aria-label={`Compact Journey: ${destination.name}`}>
      <div className="insp-compact-img-wrap">
        <img
          src={imgError ? '/images/manali/hadimbatemple.jpg' : destination.heroImage}
          alt={`${destination.name}, ${destination.region}`}
          onError={() => {
            console.warn(`[CompactDestinationCard] Failed to load heroImage for ${destination.name}: ${destination.heroImage}`);
            setImgError(true);
          }}
          loading="lazy"
        />
        <div className="insp-badge-row" style={{ top: '12px', left: '12px' }}>
          <span className="insp-category-badge" style={{ fontSize: '9px', padding: '4px 8px' }}>
            {destination.categoryLabels?.[0] || 'JOURNEY'}
          </span>
        </div>
      </div>

      <div className="insp-compact-body">
        <span className="insp-region-label" style={{ fontSize: '9.5px' }}>
          {destination.region}, {destination.country}
        </span>
        <h4>{destination.name}</h4>
        <p>{destination.tagline}</p>

        <div className="insp-compact-footer">
          <span style={{ fontSize: '11px', color: 'var(--insp-gold)', fontWeight: '600' }}>
            {destination.durationText} • {destination.budgetRange}
          </span>
          <button
            type="button"
            className="insp-compact-btn"
            onClick={() => onPlan(destination)}
          >
            PLAN &rarr;
          </button>
        </div>
      </div>
    </article>
  );
}
