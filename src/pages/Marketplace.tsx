import React, { useMemo, useState } from 'react';
import '../styles/styles.css';
import '../styles/marketplace.css';
import Navbar from '../components/Navbar';
import Background from '../components/Background';

type Commission = {
  id: number;
  title: string;
  artist: string;
  price: number;
  tags: string[];
};

// Filter categories shown in the sidebar.
const FILTERS = ['Digital Art', 'Painting', 'Illustration', 'Sketch', '3D Art'];

// Per-artist reputation scores (0-100). Generally trends above 50,
// with newer artists sitting closer to the middle.
const ARTIST_REPUTATION: Record<string, number> = {
  'Aria Vale': 92,
  'Milo Chen': 78,
  'Rin Okada': 88,
  'Kofi Mensah': 95,
  'Lena Ford': 71,
  'Sora Kim': 84,
  'Nia Blake': 66,
  'Dev Rao': 90,
  'Yuki Sato': 81,
  'Tom Reed': 74,
  'Max Wu': 58,
  'Ivy Long': 63,
  'Sam Diaz': 47,
  'Ben Cole': 55,
  'Ana Ruiz': 69,
};

const getReputation = (artist: string) => ARTIST_REPUTATION[artist] ?? 50;

// Map reputation (0-100) to an oklch hue: 25 (red) -> 145 (green).
const getReputationHue = (rep: number) => 25 + (Math.min(Math.max(rep, 0), 100) / 100) * 120;

// Placeholder commissions grouped by browse section.
const PROMOTED: Commission[] = [
  { id: 1, title: 'Neon Portrait', artist: 'Aria Vale', price: 85, tags: ['Digital Art', 'Illustration'] },
  { id: 2, title: 'Sunset Study', artist: 'Milo Chen', price: 40, tags: ['Painting'] },
  { id: 3, title: 'Cyber Cat', artist: 'Rin Okada', price: 120, tags: ['Digital Art', '3D Art'] },
  { id: 4, title: 'Ink Dragon', artist: 'Kofi Mensah', price: 150, tags: ['Sketch', 'Illustration'] },
  { id: 5, title: 'Dream Field', artist: 'Lena Ford', price: 60, tags: ['Painting', 'Digital Art'] },
];

const RECOMMENDED: Commission[] = [
  { id: 6, title: 'Chibi Duo', artist: 'Sora Kim', price: 35, tags: ['Illustration', 'Digital Art'] },
  { id: 7, title: 'Forest Spirit', artist: 'Nia Blake', price: 55, tags: ['Painting'] },
  { id: 8, title: 'Mecha Sketch', artist: 'Dev Rao', price: 25, tags: ['Sketch', '3D Art'] },
  { id: 9, title: 'Pastel Girl', artist: 'Yuki Sato', price: 48, tags: ['Digital Art'] },
  { id: 10, title: 'Old Harbor', artist: 'Tom Reed', price: 70, tags: ['Painting', 'Illustration'] },
];

const NEW_ARTISTS: Commission[] = [
  { id: 11, title: 'Doodle Pack', artist: 'Max Wu', price: 3, tags: ['Sketch'] },
  { id: 12, title: 'Fantasy Icon', artist: 'Ivy Long', price: 12, tags: ['Digital Art', 'Illustration'] },
  { id: 13, title: 'Quick Bust', artist: 'Sam Diaz', price: 5, tags: ['Sketch', 'Painting'] },
  { id: 14, title: 'Voxel Hero', artist: 'Ben Cole', price: 8, tags: ['3D Art'] },
  { id: 15, title: 'Watercolor Pet', artist: 'Ana Ruiz', price: 18, tags: ['Painting'] },
];

const ALL_COMMISSIONS = [...PROMOTED, ...RECOMMENDED, ...NEW_ARTISTS];

// Price filter bounds derived from the catalog.
const PRICE_MIN = 0;
const PRICE_MAX = Math.max(...ALL_COMMISSIONS.map((c) => c.price));

// Varied aspect ratios (width / height) to showcase different thumbnail
// resolutions. Deterministic per commission id so cards keep their shape.
const THUMB_RATIOS = [1, 4 / 3, 3 / 4, 16 / 9, 2 / 3, 3 / 2];
const THUMB_HEIGHT = 170;

const getThumbWidth = (id: number) =>
  Math.round(THUMB_HEIGHT * THUMB_RATIOS[id % THUMB_RATIOS.length]);

const CommissionCard: React.FC<{ commission: Commission }> = ({ commission }) => (
  <a
    className="mp-card"
    href={`/commission?id=${commission.id}`}
    style={{ '--thumb-width': `${getThumbWidth(commission.id)}px` } as React.CSSProperties}
    aria-label={`View details for ${commission.title} by ${commission.artist}`}
  >
    {/* Thumbnail placeholder — dimensions vary to simulate different resolutions */}
    <div className="mp-thumb" aria-hidden="true" />
    <div className="mp-card-meta">
      <span className="mp-card-title">{commission.title}</span>
      <span className="mp-card-artist">
        {commission.artist}
        <span
          className="mp-card-rep"
          style={
            {
              '--rep-hue': getReputationHue(getReputation(commission.artist)),
            } as React.CSSProperties
          }
          title={`Artist reputation: ${getReputation(commission.artist)}/100`}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l2.9 6.26L21.5 9.3l-4.75 4.4 1.15 6.8L12 17.2l-5.9 3.3 1.15-6.8L2.5 9.3l6.6-1.04L12 2z" />
          </svg>
          {getReputation(commission.artist)}
        </span>
      </span>
      <span className="mp-card-price">${commission.price}</span>
      <span className="mp-card-tags">
        {commission.tags.map((tag) => (
          <span className="mp-tag" key={tag}>
            {tag}
          </span>
        ))}
      </span>
    </div>
  </a>
);

const Section: React.FC<{ title: string; commissions: Commission[] }> = ({ title, commissions }) => (
  <section className="mp-section">
    <h2 className="mp-section-title">{title}</h2>
    <div className="mp-row" role="list" aria-label={`${title} commissions`}>
      {commissions.map((c) => (
        <CommissionCard commission={c} key={c.id} />
      ))}
    </div>
  </section>
);

const MarketPlace: React.FC = () => {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [priceMin, setPriceMin] = useState(PRICE_MIN);
  const [priceMax, setPriceMax] = useState(PRICE_MAX);
  const [minReputation, setMinReputation] = useState(0);

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter],
    );
  };

  const clearAll = () => {
    setActiveFilters([]);
    setSearchInput('');
    setQuery('');
    setPriceMin(PRICE_MIN);
    setPriceMax(PRICE_MAX);
    setMinReputation(0);
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setQuery(searchInput.trim());
  };

  const isPriceFiltered = priceMin > PRICE_MIN || priceMax < PRICE_MAX;
  const isFiltering =
    activeFilters.length > 0 || query.length > 0 || isPriceFiltered || minReputation > 0;

  // Relevant commissions matching the applied filters and/or artist/title search.
  const results = useMemo(() => {
    const q = query.toLowerCase();
    return ALL_COMMISSIONS.filter((c) => {
      const matchesFilters =
        activeFilters.length === 0 || activeFilters.some((f) => c.tags.includes(f));
      const matchesQuery =
        q.length === 0 ||
        c.artist.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q);
      const matchesPrice = c.price >= priceMin && c.price <= priceMax;
      const matchesReputation = getReputation(c.artist) >= minReputation;
      return matchesFilters && matchesQuery && matchesPrice && matchesReputation;
    });
  }, [activeFilters, query, priceMin, priceMax, minReputation]);

  return (
    <div className="marketplace-page">
      <Background
        direction="diagonal"
        speed={0.3}
        borderColor="rgba(0, 0, 0, 0.05)"
      />

      <Navbar />

      {/* Body */}
      <div className="mp-body">
        {/* Sidebar */}
        <aside className="mp-sidebar">
          {/* Profile */}
          <a className="mp-profile" href="/profile" aria-label="Your profile">
            <span className="mp-profile-avatar">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5.33 0-8 2.67-8 6v2h16v-2c0-3.33-2.67-6-8-6z" />
              </svg>
            </span>
          </a>

          {/* Search filters */}
          <div className="mp-filters">
            <span className="mp-filter-label">Categories</span>
            {FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`mp-filter-btn${activeFilters.includes(filter) ? ' active' : ''}`}
                aria-pressed={activeFilters.includes(filter)}
                onClick={() => toggleFilter(filter)}
              >
                {filter}
              </button>
            ))}

            {/* Price range */}
            <span className="mp-filter-label">Price range</span>
            <div className="mp-price-inputs">
              <label className="mp-price-field">
                <span className="sr-only">Minimum price</span>
                <span className="mp-price-prefix">$</span>
                <input
                  type="number"
                  min={PRICE_MIN}
                  max={priceMax}
                  value={priceMin}
                  onChange={(e) =>
                    setPriceMin(Math.max(PRICE_MIN, Math.min(Number(e.target.value) || 0, priceMax)))
                  }
                  aria-label="Minimum price"
                />
              </label>
              <span className="mp-price-sep" aria-hidden="true">
                –
              </span>
              <label className="mp-price-field">
                <span className="sr-only">Maximum price</span>
                <span className="mp-price-prefix">$</span>
                <input
                  type="number"
                  min={priceMin}
                  max={PRICE_MAX}
                  value={priceMax}
                  onChange={(e) =>
                    setPriceMax(Math.min(PRICE_MAX, Math.max(Number(e.target.value) || 0, priceMin)))
                  }
                  aria-label="Maximum price"
                />
              </label>
            </div>

            {/* Reputation */}
            <span className="mp-filter-label">
              Reputation
              <span className="mp-filter-value">{minReputation}+</span>
            </span>
            <input
              className="mp-rep-slider"
              type="range"
              min={0}
              max={100}
              step={5}
              value={minReputation}
              onChange={(e) => setMinReputation(Number(e.target.value))}
              aria-label={`Minimum artist reputation: ${minReputation}`}
            />

            {isFiltering && (
              <button className="mp-clear-btn" type="button" onClick={clearAll}>
                Clear filters
              </button>
            )}
          </div>
        </aside>

        {/* Main browse area */}
        <main className="mp-main">
          <section className="mp-search">
            <form className="mp-search-form" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search by artist or title..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Search commissions by artist or title"
              />
              <button type="submit" aria-label="Search">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M10 2a8 8 0 105.293 14.707l4.147 4.147a1 1 0 001.414-1.414l-4.147-4.147A8 8 0 0010 2zm0 2a6 6 0 110 12A6 6 0 0110 4z" />
                </svg>
              </button>
            </form>
          </section>
          
          {isFiltering ? (
            <section className="mp-section">
              <div className="mp-results-header">
                <h2 className="mp-section-title">Results</h2>
                <span className="mp-results-count">
                  {results.length} commission{results.length === 1 ? '' : 's'}
                  {query ? ` for "${query}"` : ''}
                </span>
              </div>
              {results.length > 0 ? (
                <div className="mp-grid">
                  {results.map((c) => (
                    <CommissionCard commission={c} key={c.id} />
                  ))}
                </div>
              ) : (
                <p className="mp-empty">No commissions match your search.</p>
              )}
            </section>
          ) : (
            <>
              <Section title="Promoted" commissions={PROMOTED} />
              <Section title="Recommended" commissions={RECOMMENDED} />
              <Section title="New Artists" commissions={NEW_ARTISTS} />
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default MarketPlace;
