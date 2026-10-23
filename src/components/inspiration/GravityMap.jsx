import React, { useMemo } from 'react';
import { getSharedThemes } from './StoryConstellation';

const WIDTH = 1000;
const HEIGHT = 560;

export default function GravityMap({
  destinations = [], selectedDestination, onSelectDestination, onOpenJourneyReel
}) {
  const nodes = useMemo(() => destinations.map((destination, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / Math.max(destinations.length, 1);
    const radiusX = destinations.length > 6 ? 350 : 300;
    const radiusY = destinations.length > 6 ? 190 : 165;
    return {
      destination,
      x: WIDTH / 2 + Math.cos(angle) * radiusX,
      y: HEIGHT / 2 + Math.sin(angle) * radiusY
    };
  }), [destinations]);

  const connections = useMemo(() => {
    const edges = [];
    nodes.forEach((a, i) => nodes.slice(i + 1).forEach((b) => {
      const theme = getSharedThemes(a.destination, b.destination);
      if (theme?.strength) edges.push({ a, b, theme });
    }));
    // Keep the strongest genuine shared-interest ties for a legible map.
    const degree = new Map();
    return edges.sort((a, b) => b.theme.strength - a.theme.strength)
      .filter((edge) => {
        const countA = degree.get(edge.a.destination.id) || 0;
        const countB = degree.get(edge.b.destination.id) || 0;
        if (countA >= 2 || countB >= 2) return false;
        degree.set(edge.a.destination.id, countA + 1);
        degree.set(edge.b.destination.id, countB + 1);
        return true;
      });
  }, [nodes]);

  const selected = destinations.find((destination) => destination.id === selectedDestination?.id) || null;
  const activeThemes = selected ? connections.filter((edge) =>
    edge.a.destination.id === selected.id || edge.b.destination.id === selected.id
  ) : [];

  return (
    <section className="gravity-map-section" aria-label="Dastaan Gravity Map">
      <div className="insp-container">
        <header className="gravity-map-header text-center">
          <div className="gravity-eyebrow-row"><span className="gravity-eyebrow">DASTAAN THEMATIC ORBITS</span></div>
          <h2 className="gravity-title">The Gravity of Shared Cultural Souls</h2>
          <p className="gravity-desc">Explore every destination. Shared interests connect journeys with a similar spirit.</p>
        </header>

        {destinations.length ? <div className="gravity-map-stage" role="region" aria-label="Interactive destination map">
          <svg className="gravity-svg-canvas" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-label="Destination connections">
            <defs>
              <filter id="gravitySoftGold" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <g className="gravity-threads-group">
              {connections.map((edge, index) => {
                const highlighted = selected && (edge.a.destination.id === selected.id || edge.b.destination.id === selected.id);
                return <g key={`${edge.a.destination.id}-${edge.b.destination.id}`}>
                  <path className={`gravity-thread ${highlighted ? 'thread-highlight' : ''} ${selected && !highlighted ? 'thread-dimmed' : ''}`}
                    d={`M ${edge.a.x} ${edge.a.y} Q ${WIDTH / 2} ${HEIGHT / 2} ${edge.b.x} ${edge.b.y}`}
                    strokeWidth={highlighted ? 2.4 : 1.3} strokeDasharray="500" strokeDashoffset="0"
                    style={{ animationDelay: `${index * 65}ms` }} filter={highlighted ? 'url(#gravitySoftGold)' : undefined} />
                </g>;
              })}
            </g>
            {nodes.map(({ destination, x, y }, index) => {
              const isSelected = selected?.id === destination.id;
              return <g key={destination.id} className={`gravity-destination-node ${isSelected ? 'is-selected' : ''}`}
                transform={`translate(${x} ${y})`} style={{ animationDelay: `${index * 55}ms` }}
                role="button" tabIndex="0" aria-pressed={isSelected} aria-label={`Select ${destination.name}`}
                onClick={() => onSelectDestination?.(destination)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectDestination?.(destination); } }}>
                <title>{destination.name}</title>
                <circle className="gravity-node-halo" r="36" />
                <image href={destination.heroImage} x="-27" y="-27" width="54" height="54" preserveAspectRatio="xMidYMid slice" />
                <circle className="gravity-node-border" r="28" />
                <text className="gravity-node-label" y="46" textAnchor="middle">{destination.name}</text>
              </g>;
            })}
          </svg>
        </div> : <p className="gravity-empty" role="status">No destinations match these filters.</p>}

        {selected && <aside className="gravity-preview" aria-live="polite">
          <img src={selected.heroImage} alt="" />
          <div className="gravity-preview-copy">
            <span className="gravity-preview-kicker">SELECTED JOURNEY</span>
            <h3>{selected.name}</h3>
            <p>{selected.region}, {selected.country} · {selected.tagline}</p>
            {activeThemes.length > 0 ? <p className="gravity-preview-reason">Connected through {Array.from(new Set(activeThemes.flatMap((edge) => edge.theme.sharedTags || []))).join(', ')}.</p>
              : <p className="gravity-preview-reason">No shared-interest connections among the destinations currently shown.</p>}
          </div>
          <div className="gravity-preview-actions">
            <button type="button" className="btn-reel-card-trigger" onClick={() => onOpenJourneyReel?.(selected)}>OPEN JOURNEY REEL →</button>
            <button type="button" className="gravity-clear-selection" onClick={() => onSelectDestination?.(null)}>RETURN TO EXPLORING</button>
          </div>
        </aside>}
        <p className="gravity-proximity-note">Lines connect destinations with shared interests or cultural themes.</p>
      </div>
    </section>
  );
}
