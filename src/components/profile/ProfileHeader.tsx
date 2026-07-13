import React from 'react';
import {
  ACCOUNT_AGE_LABELS,
  ACTIVITY_STATUS_LABELS,
  NEW_ARTIST_LABEL,
  type ProfileOverview,
  type SocialLink,
} from '../../lib/profiles';

// Map reputation (0-100) to a hue: red (low) -> green (high).
const repColor = (rep: number) => `hsl(${Math.min(Math.max(rep, 0), 100) * 1.2}, 75%, 45%)`;

const ProfileHeader: React.FC<{
  profile: ProfileOverview;
  socialLinks: SocialLink[];
  isOwn: boolean;
  isFollowing: boolean;
  canFollow: boolean;
  followBusy: boolean;
  onToggleFollow: () => void;
}> = ({ profile, socialLinks, isOwn, isFollowing, canFollow, followBusy, onToggleFollow }) => (
  <header className="pf-panel pf-header">
    <div className="pf-avatar-wrap">
      <span className="pf-avatar">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5.33 0-8 2.67-8 6v2h16v-2c0-3.33-2.67-6-8-6z" />
        </svg>
      </span>
      <span
        className={`pf-status-dot ${profile.activity_status}`}
        title={ACTIVITY_STATUS_LABELS[profile.activity_status]}
        role="img"
        aria-label={`Activity status: ${ACTIVITY_STATUS_LABELS[profile.activity_status]}`}
      />
    </div>

    <div className="pf-head-main">
      <div className="pf-name-row">
        <h1 className="pf-username">{profile.username}</h1>
        <span className="pf-status-label">{ACTIVITY_STATUS_LABELS[profile.activity_status]}</span>
      </div>

      <div className="pf-badges-row">
        {profile.is_new_artist && (
          <span
            className="pf-pill new-artist"
            title="This artist has fewer than 5 completed sales. Their reputation score reflects a fresh start, not fraud."
          >
            {NEW_ARTIST_LABEL}
          </span>
        )}
        {profile.is_admin && <span className="pf-pill admin">Admin</span>}
        {profile.badges.map((b) => (
          <span className="pf-pill badge" key={b.id} title={b.description}>
            {b.name}
          </span>
        ))}
      </div>

      <div className="pf-reputation">
        <span className="pf-rep-label">{profile.reputation}/100 Reputation</span>
        <div
          className="pf-rep-bar"
          role="progressbar"
          aria-valuenow={profile.reputation}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Reputation"
        >
          <div
            className="pf-rep-bar-fill"
            style={{ width: `${profile.reputation}%`, backgroundColor: repColor(profile.reputation) }}
          />
        </div>
        {profile.is_new_artist && (
          <span className="pf-new-artist-note">
            New artists start at 50 — this score isn&apos;t a red flag, they just haven&apos;t sold
            5 commissions yet.
          </span>
        )}
      </div>

      <div className="pf-stats">
        <div className="pf-stat">
          <span className="pf-stat-value">{profile.sales_count}</span>
          <span className="pf-stat-label">Sales</span>
        </div>
        <div className="pf-stat">
          <span className="pf-stat-value">{profile.follower_count}</span>
          <span className="pf-stat-label">Followers</span>
        </div>
        <div className="pf-stat">
          <span className="pf-stat-value">{profile.following_count}</span>
          <span className="pf-stat-label">Following</span>
        </div>
        <div className="pf-stat">
          <span className="pf-stat-value">
            {profile.review_count > 0 ? `${profile.average_rating}/5` : '—'}
          </span>
          <span className="pf-stat-label">Rating</span>
        </div>
        <div className="pf-stat">
          <span className="pf-stat-value">{ACCOUNT_AGE_LABELS[profile.account_age_tier]}</span>
          <span className="pf-stat-label">Account Age</span>
        </div>
      </div>
    </div>

    <div className="pf-head-side">
      {!isOwn && canFollow && (
        <button
          type="button"
          className={`pf-follow-btn${isFollowing ? ' following' : ''}`}
          onClick={onToggleFollow}
          disabled={followBusy}
        >
          {isFollowing ? 'Unfollow' : 'Follow'}
        </button>
      )}
      {socialLinks.length > 0 && (
        <nav className="pf-socials" aria-label="External links">
          {socialLinks.map((link) => (
            <a
              className="pf-social-link"
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M10.6 13.4a1 1 0 001.4 1.4l6-6a3 3 0 00-4.2-4.2l-2.4 2.4a1 1 0 001.4 1.4l2.4-2.4a1 1 0 011.4 1.4l-6 6zm2.8-2.8a1 1 0 00-1.4-1.4l-6 6a3 3 0 004.2 4.2l2.4-2.4a1 1 0 00-1.4-1.4l-2.4 2.4a1 1 0 01-1.4-1.4l6-6z" />
              </svg>
              {link.platform}
            </a>
          ))}
        </nav>
      )}
    </div>
  </header>
);

export default ProfileHeader;
