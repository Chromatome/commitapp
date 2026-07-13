import React from 'react';
import type { ReviewWithReviewer } from '../../lib/profiles';

const Stars: React.FC<{ rating: number }> = ({ rating }) => (
  <span className="pf-review-stars" aria-label={`${rating} out of 5 stars`}>
    {'★'.repeat(rating)}
    {'☆'.repeat(5 - rating)}
  </span>
);

const ReviewList: React.FC<{ reviews: ReviewWithReviewer[] }> = ({ reviews }) => (
  <section className="pf-panel">
    <h2 className="pf-section-title">Reviews</h2>
    {reviews.length > 0 ? (
      <div className="pf-review-list">
        {reviews.map((review) => (
          <article className="pf-review" key={review.id}>
            <header className="pf-review-header">
              <span className="pf-review-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5.33 0-8 2.67-8 6v2h16v-2c0-3.33-2.67-6-8-6z" />
                </svg>
              </span>
              <span className="pf-review-name">
                {review.reviewer ? (
                  <a href={`/profile?id=${review.reviewer.id}`} style={{ color: 'inherit' }}>
                    {review.reviewer.username}
                  </a>
                ) : (
                  'Deleted user'
                )}
              </span>
              <Stars rating={review.rating} />
              <span className="pf-review-date">
                {new Date(review.created_at).toLocaleDateString()}
              </span>
            </header>
            {review.body && <p className="pf-review-body">{review.body}</p>}
          </article>
        ))}
      </div>
    ) : (
      <p className="pf-empty">No reviews yet.</p>
    )}
  </section>
);

export default ReviewList;
