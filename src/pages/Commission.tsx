import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import '../styles/styles.css';
import '../styles/commissioninfo.css';
import Navbar from '../components/Navbar';
import Background from '../components/Background';
import Button from '../components/Button';
import LinkButton from '../components/LinkButton';
import {
  fetchCommissionInfo,
  type CommissionInfoData,
  type PaymentType,
} from '../lib/profileData';

// Number of carousel slides (placeholder previews until commission galleries exist).
const CAROUSEL_SLIDES = 4;

const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  upfront: 'Full Payment Upfront',
  installments: 'Installments Per Phase (Even)',
  split: 'Split Payment',
};

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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const commissionId = searchParams.get('id');

  const [data, setData] = useState<CommissionInfoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeSlide, setActiveSlide] = useState(0);
  const [reviewSearch, setReviewSearch] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<ReviewSort>('recent');

  useEffect(() => {
    if (!commissionId) {
      setLoading(false);
      setLoadError('No commission selected. Browse the marketplace to pick one.');
      return;
    }
    let cancelled = false;
    setLoading(true);

    fetchCommissionInfo(commissionId)
      .then((info) => {
        if (cancelled) return;
        if (!info) {
          setLoadError('This commission could not be found. It may have been removed.');
        } else {
          setData(info);
          setLoadError(null);
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError('Something went wrong loading this commission. Try refreshing.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [commissionId]);

  const nextSlide = () => setActiveSlide((s) => (s + 1) % CAROUSEL_SLIDES);
  const prevSlide = () => setActiveSlide((s) => (s - 1 + CAROUSEL_SLIDES) % CAROUSEL_SLIDES);

  const reviews = data?.reviews ?? [];

  // Filter + sort reviews based on the review search controls.
  const filteredReviews = useMemo(() => {
    const q = reviewSearch.trim().toLowerCase();
    const list = reviews.filter((r) => {
      const matchesQuery =
        q.length === 0 ||
        r.reviewer_name.toLowerCase().includes(q) ||
        (r.text ?? '').toLowerCase().includes(q);
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
        sorted.sort((a, b) => (b.reviewer_reputation ?? 0) - (a.reviewer_reputation ?? 0));
        break;
      default:
        break; // 'recent' keeps newest-first order from the query
    }
    return sorted;
  }, [reviews, reviewSearch, minRating, sort]);

  const avgSatisfaction =
    reviews.length > 0
      ? `${(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}/5`
      : 'No ratings yet';

  if (loading || loadError) {
    return (
      <div className="commission-page">
        <Background direction="diagonal" speed={0.3} borderColor="rgba(0, 0, 0, 0.05)" />
        <Navbar />
        <div className="ci-body">
          <p className="ci-page-status">{loading ? 'Loading commission…' : loadError}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { commission, artist } = data;
  const priceCredits = Number(commission.price).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // Rough USD estimate after the platform fee (credits are 1:1 with USD pre-fee).
  const totalUsdAfterFee = `$${(Number(commission.price) * 1.0107).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const phaseCount = Math.max(commission.phases.length, 1);
  const pricePerPhase = `$${((Number(commission.price) * 1.0107) / phaseCount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} + Tax`;

  return (
    <div className="commission-page">
      <Background
        direction="diagonal"
        speed={0.3}
        borderColor="rgba(0, 0, 0, 0.05)"
      />

      {/* Header (matches marketplace) */}
      <Navbar />


      {/* Body */}
      <div className="ci-body">
        {/* Left column: showcase + purchase */}
        <div className="ci-left">
          <div className="ci-purchase-card">
            <h1 className="ci-comm-title">{commission.title}</h1>
            <p className="ci-comm-price">{priceCredits} Credits + Fee</p>
            <div className="ci-purchase-actions">
              <LinkButton label="Purchase" href="/purchase" isPrimary color="var(--pink)"/>
              <Button
                label="Contact"
                onClick={() => navigate(`/messages?with=${artist.id}`)}
                color="var(--gray-bg)"
              />
            </div>
          </div>

          <div className="ci-showcase">
            {/* Image carousel placeholder */}
            <div className="ci-carousel" aria-label="Commission preview carousel">
              <div
                className="ci-carousel-image"
                role="img"
                aria-label={`Preview ${activeSlide + 1}`}
                style={
                  commission.thumbnail_url && activeSlide === 0
                    ? {
                        backgroundImage: `url(${commission.thumbnail_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : undefined
                }
              >
                <span className="ci-carousel-index">
                  {activeSlide + 1} / {CAROUSEL_SLIDES}
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
                {Array.from({ length: CAROUSEL_SLIDES }).map((_, i) => (
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


        </div>

        {/* Right column: scrollable info */}
        <div className="ci-right">
          {/* Artist header */}
          <div className="ci-artist-card">
            <a
              className="ci-artist-avatar-link"
              href={`/profile?id=${artist.id}`}
              aria-label={`View ${artist.username}'s profile`}
            >
              {artist.avatar_url ? (
                <span className="ci-avatar">
                  <img
                    src={artist.avatar_url}
                    alt=""
                    style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
                  />
                </span>
              ) : (
                <Avatar size={48} />
              )}
            </a>
            <div className="ci-artist-meta">
              <span className="ci-artist-name">{artist.username}</span>
              <div className="ci-artist-reputation">
                <span className="ci-artist-rep">
                  {artist.reputation}/100 Reputation
                </span>
                <div
                  className="ci-rep-bar"
                  role="progressbar"
                  aria-valuenow={artist.reputation}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Artist reputation"
                >
                  <div
                    className="ci-rep-bar-fill"
                    style={{
                      width: `${artist.reputation}%`,
                      backgroundColor: `hsl(${artist.reputation * 1.2}, 75%, 45%)`,
                    }}
                  />
                </div>
              </div>
              {artist.about_me && <span className="ci-artist-review">{artist.about_me}</span>}
            </div>
          </div>

          {/* Description */}
          <section className="ci-panel ci-description">
            <h2 className="ci-panel-title">Description</h2>
            <div className="ci-desc-grid">
              <div className="ci-desc-item">
                <span className="ci-desc-label">Payment Type</span>
                <span className="ci-desc-value">
                  {PAYMENT_TYPE_LABELS[commission.payment_type] ?? commission.payment_type}
                </span>
              </div>
              <div className="ci-desc-item">
                <span className="ci-desc-label">Time</span>
                <span className="ci-desc-value">{commission.time_taken || 'Varies'}</span>
              </div>
              <div className="ci-desc-item ci-desc-item-wide">
                <span className="ci-desc-label">Phases</span>
                <span className="ci-desc-value">
                  {commission.phases.length > 0 ? commission.phases.join(', ') : 'Single delivery'}
                </span>
              </div>
              <div className="ci-desc-item">
                <span className="ci-desc-label">Sold</span>
                <span className="ci-desc-value">{commission.times_sold}</span>
              </div>
              <div className="ci-desc-item">
                <span className="ci-desc-label">Avg. Satisfaction</span>
                <span className="ci-desc-value">{avgSatisfaction}</span>
              </div>
              <div className="ci-desc-item">
                <span className="ci-desc-label">Total USD Price After Fee</span>
                <span className="ci-desc-value">{totalUsdAfterFee}</span>
              </div>
              <div className="ci-desc-item">
                <span className="ci-desc-label">Price Per Phase</span>
                <span className="ci-desc-value">{pricePerPhase}</span>
              </div>
              <div className="ci-desc-item ci-desc-item-wide">
                <span className="ci-desc-label">Artist Terms</span>
                <span className="ci-desc-value">
                  {commission.artist_terms || 'No custom terms provided.'}
                </span>
              </div>
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
                      <span className="ci-review-customer">{review.reviewer_name}</span>
                      <span className="ci-review-reputation">
                        {review.reviewer_reputation ?? '—'}/100 Rep
                      </span>
                      <span className="ci-review-rating">Rating: {review.rating}/5</span>
                    </header>
                    {review.text && <p className="ci-review-text">{review.text}</p>}
                  </article>
                ))
              ) : (
                <p className="ci-review-empty">
                  {reviews.length === 0 ? 'No reviews yet.' : 'No reviews match your search.'}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CommissionInfo;
