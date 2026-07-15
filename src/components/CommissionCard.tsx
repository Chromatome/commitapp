import React from 'react';
import "../styles/styles.css";

// A commission listing card. Real listings from the database use their uuid
// as the id; placeholder listings keep their numeric ids.
export type Commission = {
  id: number | string;
  title: string;
  artist: string;
  price: number;
  tags: string[];
  /** Reputation for real listings comes from the artist's profile row. */
  reputation?: number;
  /** Total completed sales for the artist; fewer than 5 marks them as "New". */
  salesCount?: number;
  /** Uploaded thumbnail for real listings; placeholders have none. */
  thumbnailUrl?: string | null;
};

const NEW_ARTIST_SALES_THRESHOLD = 5;

const getReputation = (c: Commission) => c.reputation ?? 50;

// Artists with fewer than 5 sales are considered too new to have an
// established reputation, so we show a "New" badge instead of a score.
const isNewArtist = (c: Commission) => (c.salesCount ?? NEW_ARTIST_SALES_THRESHOLD) < NEW_ARTIST_SALES_THRESHOLD;

// Map reputation (0-100) to an oklch hue: 25 (red) -> 145 (green).
const getReputationHue = (rep: number) => 25 + (Math.min(Math.max(rep, 0), 100) / 100) * 120;

// Varied aspect ratios (width / height) to showcase different thumbnail
// resolutions. Deterministic per commission id so cards keep their shape.
const THUMB_RATIOS = [1, 4 / 3, 3 / 4, 16 / 9, 2 / 3, 3 / 2];
const THUMB_HEIGHT = 170;

// Deterministic numeric seed for both numeric placeholder ids and uuid strings.
const idSeed = (id: number | string) =>
  typeof id === 'number'
    ? id
    : Array.from(id).reduce((acc, ch) => (acc + ch.charCodeAt(0)) % 997, 0);

const getThumbWidth = (id: number | string) =>
  Math.round(THUMB_HEIGHT * THUMB_RATIOS[idSeed(id) % THUMB_RATIOS.length]);

export const CommissionCard: React.FC<{ commission: Commission }> = ({ commission }) => (
  <a
    className="mp-card"
    href={`/commission?id=${commission.id}`}
    style={{ '--thumb-width': `${getThumbWidth(commission.id)}px` } as React.CSSProperties}
    aria-label={`View details for ${commission.title} by ${commission.artist}`}
  >
    {/* Thumbnail — real upload if the artist added one, otherwise a colored
        placeholder whose dimensions vary to simulate different resolutions */}
    <div className="mp-thumb" aria-hidden="true">
      {commission.thumbnailUrl && (
        <img src={commission.thumbnailUrl} alt="" className="mp-thumb-img" />
      )}
    </div>
    <div className="mp-card-meta">
      <span className="mp-card-title">{commission.title}</span>
      <span className="mp-card-artist">
        {commission.artist}
        {isNewArtist(commission) ? (
          <span className="mp-card-rep mp-card-rep-new" title="New artist: fewer than 5 sales">
            New
          </span>
        ) : (
          <span
            className="mp-card-rep"
            style={
              {
                '--rep-hue': getReputationHue(getReputation(commission)),
              } as React.CSSProperties
            }
            title={`Artist reputation: ${getReputation(commission)}/100`}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l2.9 6.26L21.5 9.3l-4.75 4.4 1.15 6.8L12 17.2l-5.9 3.3 1.15-6.8L2.5 9.3l6.6-1.04L12 2z" />
            </svg>
            {getReputation(commission)}
          </span>
        )}
      </span>
      <span className="mp-card-price">{commission.price} C$</span>
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

export default CommissionCard;
