import React, { useMemo, useState } from 'react';
import '../styles/styles.css';
import '../styles/marketplace.css';

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

const CommissionCard: React.FC<{ commission: Commission }> = ({ commission }) => (
  <button className="mp-card" type="button">
    {/* Thumbnail placeholder */}
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
  </button>
);

const Section: React.FC<{ title: string; commissions: Commission[] }> = ({ title, commissions }) => (
  <section className="mp-section">
    <h2 className="mp-section-title">{title}</h2>
    <div className="mp-grid">
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

  const handleSearch = (e: React.FormEvent) => {
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
      <p className="mp-breadcrumb">Home page/Marketplace</p>

      {/* Header */}
      <header className="mp-header">
        <button className="mp-logo" type="button" aria-label="CommIt home">
          <svg
            className="mp-logo-star"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2l2.9 6.26L21.8 9.27l-5 4.87 1.18 6.88L12 17.77 6.02 21l1.18-6.86-5-4.87 6.9-1.01L12 2z" />
          </svg>
          <span className="mp-logo-text">CommIt</span>
        </button>

        <div className="mp-header-right">
          <form className="mp-search-form" onSubmit={handleSearch} role="search">
            <label className="sr-only" htmlFor="mp-search">
              Search by artist or title
            </label>
            <input
              id="mp-search"
              className="mp-search-input"
              type="text"
              placeholder="Search by artist or title"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button className="mp-search-btn" type="submit">
              Search
            </button>
          </form>
          <div className="mp-credits">Credits: 0000</div>
        </div>
      </header>

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
