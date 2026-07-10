import React, { useMemo, useState } from 'react';
import '../styles/styles.css';
import '../styles/commissioninfo.css';

type Review = {
  id: number;
  customer: string;
  rating: number; // out of 5
  reputation: number; // out of 100
  text: string;
};

// Placeholder commission data — these would come from the selected marketplace listing.
const COMMISSION = {
  title: 'Comm Title',
  priceCredits: '1,000.00',
  images: 4, // number of carousel slides (placeholders)
  artist: {
    name: 'Artist Name',
    reputation: 89,
  },
  description: {
    paymentType: 'Installments Per Phase (Even)',
    time: '~1 month',
    phases: 'Sketch, Line Art, Colored, Rendered/Final',
    sold: 67,
    avgSatisfaction: '5/5',
    totalUsdAfterFee: '$1,010.70',
    pricePerPhase: '$252.56 + Tax',
    artistTerms: 'Lorem Ipsum Dolor It ... Artist Custom Terms',
  },
};

const REVIEWS: Review[] = [
  {
    id: 1,
    customer: 'PlaceholderCustomer',
    rating: 5,
    reputation: 92,
    text: 'The artist was responsive and I was satisfied with my product! Would 100% recommend.',
  },
  {
    id: 2,
    customer: 'PlaceholderCustomer',
    rating: 5,
    reputation: 78,
    text: 'The artist was responsive and I was satisfied with my product! Would 100% recommend.',
  },
  {
    id: 3,
    customer: 'PixelPatron',
    rating: 4,
    reputation: 64,
    text: 'Great communication throughout the phases. Delivery took a little longer than expected but the final piece was worth it.',
  },
  {
    id: 4,
    customer: 'CanvasCollector',
    rating: 3,
    reputation: 45,
    text: 'Solid work overall. A few revisions were needed but the artist handled them professionally.',
  },
];

// Reusable person avatar placeholder.
const Avatar: React.FC<{ size?: number; className?: string }> = ({ size = 40, className }) => (
  <span className={`ci-avatar${className ? ` ${className}` : ''}`}>
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5.33 0-8 2.67-8 6v2h16v-2c0-3.33-2.67-6-8-6z" />
    </svg>
  </span>
);

type ReviewSort = 'recent' | 'highest' | 'lowest' | 'reputation';

const CommissionInfo: React.FC = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [reviewSearch, setReviewSearch] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<ReviewSort>('recent');

  const nextSlide = () => setActiveSlide((s) => (s + 1) % COMMISSION.images);
  const prevSlide = () => setActiveSlide((s) => (s - 1 + COMMISSION.images) % COMMISSION.images);

  // Filter + sort reviews based on the review search controls.
  const filteredReviews = useMemo(() => {
    const q = reviewSearch.trim().toLowerCase();
    const list = REVIEWS.filter((r) => {
      const matchesQuery =
        q.length === 0 ||
        r.customer.toLowerCase().includes(q) ||
        r.text.toLowerCase().includes(q);
      const matchesRating = r.rating >= minRating;
      return matchesQuery && matchesRating;
    });

    const sorted = [...list];
    switch (sort) {
      case 'highest':
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case 'lowest':
        sorted.sort((a, b) => a.rating - b.rating);
        break;
      case 'reputation':
        sorted.sort((a, b) => b.reputation - a.reputation);
        break;
      default:
        break; // 'recent' keeps original order
    }
    return sorted;
  }, [reviewSearch, minRating, sort]);

  return (
    <div className="commission-page">
      {/* Header (matches marketplace) */}
      <header className="ci-header">
        <a className="ci-logo" href="/" aria-label="CommIt home">
          <svg className="ci-logo-star" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l2.9 6.26L21.8 9.27l-5 4.87 1.18 6.88L12 17.77 6.02 21l1.18-6.86-5-4.87 6.9-1.01L12 2z" />
          </svg>
          <span className="ci-logo-text">CommIt</span>
        </a>

        <div className="ci-header-right">
          <form className="ci-search-form" role="search" onSubmit={(e) => e.preventDefault()}>
            <label className="sr-only" htmlFor="ci-search">
              Search
            </label>
            <input id="ci-search" className="ci-search-input" type="text" placeholder="Search" />
            <button className="ci-search-btn" type="submit">
              Search
            </button>
          </form>
          <div className="ci-credits">Credits: 0000</div>
        </div>
      </header>

      {/* Body */}
      <div className="ci-body">
        {/* Left column: showcase + purchase */}
        <div className="ci-left">
          <div className="ci-showcase">
            {/* Image carousel placeholder */}
            <div className="ci-carousel" aria-label="Commission preview carousel">
              <div className="ci-carousel-image" role="img" aria-label={`Preview ${activeSlide + 1}`}>
                <span className="ci-carousel-index">
                  {activeSlide + 1} / {COMMISSION.images}
                </span>
              </div>
              <button
                type="button"
                className="ci-carousel-arrow ci-carousel-prev"
                onClick={prevSlide}
                aria-label="Previous image"
              >
                &#8249;
              </button>
              <button
                type="button"
                className="ci-carousel-arrow ci-carousel-next"
                onClick={nextSlide}
                aria-label="Next image"
              >
                &#8250;
              </button>
              <div className="ci-carousel-dots">
                {Array.from({ length: COMMISSION.images }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`ci-dot${i === activeSlide ? ' active' : ''}`}
                    aria-label={`Go to image ${i + 1}`}
                    aria-current={i === activeSlide}
                    onClick={() => setActiveSlide(i)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="ci-purchase-card">
            <h1 className="ci-comm-title">{COMMISSION.title}</h1>
            <p className="ci-comm-price">{COMMISSION.priceCredits} Credits + Fee</p>
            <div className="ci-purchase-actions">
              <button type="button" className="ci-btn ci-btn-purchase">
                Purchase
              </button>
              <button type="button" className="ci-btn ci-btn-contact">
                Contact
              </button>
            </div>
          </div>
        </div>

        {/* Right column: scrollable info */}
        <div className="ci-right">
          {/* Artist header */}
          <div className="ci-artist-card">
            {/* Links to the artist's profile once implemented */}
            <a className="ci-artist-avatar-link" href="/profile" aria-label="View artist profile">
              <Avatar size={48} />
            </a>
            <div className="ci-artist-meta">
              <span className="ci-artist-name">{COMMISSION.artist.name}</span>
              <span className="ci-artist-rep">{COMMISSION.artist.reputation}/100 Reputation</span>
            </div>
          </div>

          {/* Description */}
          <section className="ci-panel ci-description">
            <h2 className="ci-panel-title">Description</h2>
            <p className="ci-field">
              <strong>Payment Type</strong> - {COMMISSION.description.paymentType}
            </p>
            <p className="ci-field">
              <strong>Time</strong> - {COMMISSION.description.time}
            </p>
            <p className="ci-field">
              <strong>Phases</strong> - {COMMISSION.description.phases}
            </p>

            <div className="ci-field-group">
              <p className="ci-field">
                <strong>Sold:</strong> {COMMISSION.description.sold}
              </p>
              <p className="ci-field">
                <strong>Avg. Satisfaction:</strong> {COMMISSION.description.avgSatisfaction}
              </p>
              <p className="ci-field">
                <strong>Total USD Price After Fee:</strong> {COMMISSION.description.totalUsdAfterFee}
              </p>
              <p className="ci-field">
                <strong>Price Per Phase:</strong> {COMMISSION.description.pricePerPhase}
              </p>
            </div>

            <div className="ci-field-group">
              <p className="ci-field">
                <strong>Artist Terms:</strong>
              </p>
              <p className="ci-field">{COMMISSION.description.artistTerms}</p>
            </div>
          </section>

          {/* Reviews */}
          <section className="ci-reviews">
            <div className="ci-reviews-toolbar">
              <h2 className="ci-panel-title ci-reviews-title">Reviews</h2>
              <div className="ci-review-filters">
                <label className="sr-only" htmlFor="ci-review-search">
                  Search reviews
                </label>
                <input
                  id="ci-review-search"
                  className="ci-review-search"
                  type="text"
                  placeholder="Search reviews"
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                />
                <label className="sr-only" htmlFor="ci-review-rating">
                  Minimum rating
                </label>
                <select
                  id="ci-review-rating"
                  className="ci-review-select"
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                >
                  <option value={0}>All ratings</option>
                  <option value={5}>5 stars</option>
                  <option value={4}>4+ stars</option>
                  <option value={3}>3+ stars</option>
                </select>
                <label className="sr-only" htmlFor="ci-review-sort">
                  Sort reviews
                </label>
                <select
                  id="ci-review-sort"
                  className="ci-review-select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as ReviewSort)}
                >
                  <option value="recent">Most recent</option>
                  <option value="highest">Highest rated</option>
                  <option value="lowest">Lowest rated</option>
                  <option value="reputation">Customer reputation</option>
                </select>
              </div>
            </div>

            <div className="ci-review-list">
              {filteredReviews.length > 0 ? (
                filteredReviews.map((review) => (
                  <article className="ci-panel ci-review" key={review.id}>
                    <header className="ci-review-header">
                      <Avatar size={28} />
                      <span className="ci-review-customer">{review.customer}</span>
                      <span className="ci-review-reputation">{review.reputation}/100 Rep</span>
                      <span className="ci-review-rating">Rating: {review.rating}/5</span>
                    </header>
                    <p className="ci-review-text">{review.text}</p>
                  </article>
                ))
              ) : (
                <p className="ci-review-empty">No reviews match your search.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CommissionInfo;