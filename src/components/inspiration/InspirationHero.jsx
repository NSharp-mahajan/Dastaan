import React from 'react';

export default function InspirationHero({ onExploreClick, onQuickCategorySelect }) {
  return (
    <section className="insp-hero" aria-label="Trip Inspiration Introduction">
      <div className="insp-hero-bg">
        <img
          src="/images/jaipur/amerfortandasheeshmahal.jpg"
          alt="Amer Fort Golden Hour Panorama"
          loading="eager"
        />
        <div className="insp-hero-overlay"></div>
      </div>

      <div className="insp-hero-content">
        <span className="insp-hero-eyebrow">
          DASTAAN &middot; TRIP INSPIRATION
        </span>

        <h1>FIND THE TRIP THAT FEELS LIKE YOU.</h1>

        <p className="insp-hero-subtext">
          Travel begins with an emotion, a quiet curiosity, or an urge to wander.
          Explore art-directed stories, mountain sanctuaries, and heritage crossroads
          tailored to the way you want to experience the world.
        </p>

        <div className="insp-hero-actions">
          <button
            type="button"
            className="btn-insp-primary"
            onClick={onExploreClick}
          >
            EXPLORE CURATED STORIES &darr;
          </button>
          
          <button
            type="button"
            className="btn-insp-outline"
            onClick={() => onQuickCategorySelect('weekend')}
          >
            WEEKEND ESCAPES
          </button>
        </div>

        <button
          type="button"
          className="insp-scroll-prompt"
          onClick={onExploreClick}
          aria-label="Scroll to destination collections"
        >
          <span>DISCOVER BY MOOD</span>
          <span className="insp-scroll-arrow">&darr;</span>
        </button>
      </div>
    </section>
  );
}
