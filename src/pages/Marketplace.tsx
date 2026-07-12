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

// Placeholder commissions grouped by browse section.
const PROMOTED: Commission[] = [
  { id: 1, title: 'Neon Portrait', artist: 'Aria Vale', price: 45, tags: ['Digital Art', 'Illustration'] },
  { id: 2, title: 'Sunset Study', artist: 'Milo Chen', price: 45, tags: ['Painting'] },
  { id: 3, title: 'Cyber Cat', artist: 'Rin Okada', price: 45, tags: ['Digital Art', '3D Art'] },
  { id: 4, title: 'Ink Dragon', artist: 'Kofi Mensah', price: 45, tags: ['Sketch', 'Illustration'] },
  { id: 5, title: 'Dream Field', artist: 'Lena Ford', price: 45, tags: ['Painting', 'Digital Art'] },
];

const RECOMMENDED: Commission[] = [
  { id: 6, title: 'Chibi Duo', artist: 'Sora Kim', price: 45, tags: ['Illustration', 'Digital Art'] },
  { id: 7, title: 'Forest Spirit', artist: 'Nia Blake', price: 45, tags: ['Painting'] },
  { id: 8, title: 'Mecha Sketch', artist: 'Dev Rao', price: 45, tags: ['Sketch', '3D Art'] },
  { id: 9, title: 'Pastel Girl', artist: 'Yuki Sato', price: 45, tags: ['Digital Art'] },
  { id: 10, title: 'Old Harbor', artist: 'Tom Reed', price: 45, tags: ['Painting', 'Illustration'] },
];

const NEW_ARTISTS: Commission[] = [
  { id: 11, title: 'Doodle Pack', artist: 'Max Wu', price: 3, tags: ['Sketch'] },
  { id: 12, title: 'Fantasy Icon', artist: 'Ivy Long', price: 10, tags: ['Digital Art', 'Illustration'] },
  { id: 13, title: 'Quick Bust', artist: 'Sam Diaz', price: 4, tags: ['Sketch', 'Painting'] },
  { id: 14, title: 'Voxel Hero', artist: 'Ben Cole', price: 6, tags: ['3D Art'] },
  { id: 15, title: 'Watercolor Pet', artist: 'Ana Ruiz', price: 10, tags: ['Painting'] },
];

const ALL_COMMISSIONS = [...PROMOTED, ...RECOMMENDED, ...NEW_ARTISTS];

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
      <span className="mp-card-artist">{commission.artist}</span>
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

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter],
    );
  };

  const clearAll = () => {
    setActiveFilters([]);
    setSearchInput('');
    setQuery('');
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setQuery(searchInput.trim());
  };

  const isFiltering = activeFilters.length > 0 || query.length > 0;

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
      return matchesFilters && matchesQuery;
    });
  }, [activeFilters, query]);

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
          {/* Profile — will link to the user's profile once implemented */}
          <button className="mp-profile" type="button" aria-label="Your profile">
            <span className="mp-profile-avatar">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5.33 0-8 2.67-8 6v2h16v-2c0-3.33-2.67-6-8-6z" />
              </svg>
            </span>
          </button>

          {/* Search filters */}
          <div className="mp-filters">
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
