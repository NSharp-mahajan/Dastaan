import React from 'react';
import { INSPIRATION_CATEGORIES, INSPIRATION_DESTINATIONS } from '../../data/inspirationData';

export default function CategoryFilterBar({
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  totalResultsCount,
  onResetFilters
}) {
  return (
    <div className="insp-filter-section" id="curated-collections">
      <div className="insp-container">
        <div className="insp-filter-header">
          {/* Scrollable Category Chips */}
          <div className="insp-chips-wrap" role="tablist" aria-label="Trip Inspiration Categories">
            {INSPIRATION_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              const count = cat.id === 'all'
                ? INSPIRATION_DESTINATIONS.length
                : INSPIRATION_DESTINATIONS.filter((d) => (d.categories || []).includes(cat.id)).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`insp-filter-chip ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectCategory(cat.id)}
                >
                  <span className="chip-label">{cat.label}</span>
                  <span className="chip-count">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Compact Quick Search Input */}
          <div className="insp-search-wrapper">
            <svg
              className="insp-search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="insp-search-input"
              placeholder="Search by city or country..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="Filter destinations by keyword"
            />
            {searchQuery && (
              <button
                type="button"
                className="insp-search-clear"
                onClick={() => onSearchChange('')}
                aria-label="Clear search query"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Filter State Bar */}
        {(activeCategory !== 'all' || searchQuery) && (
          <div className="insp-active-summary">
            <span>
              Showing {totalResultsCount} inspired journey{totalResultsCount !== 1 ? 's' : ''}
              {activeCategory !== 'all' && (
                <> in <strong>{INSPIRATION_CATEGORIES.find(c => c.id === activeCategory)?.label}</strong></>
              )}
              {searchQuery && (
                <> matching "<strong>{searchQuery}</strong>"</>
              )}
            </span>

            <button
              type="button"
              className="btn-reset-filter"
              onClick={onResetFilters}
            >
              Show All Collections &times;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
