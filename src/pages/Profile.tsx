import React from 'react';
import '../styles/styles.css';
import '../styles/profile.css';
import Navbar from '../components/Navbar';
import Background from '../components/Background';

type Listing = {
  id: number;
  title: string;
  price: number;
  tags: string[];
};

type Badge = {
  id: number;
  name: string;
  description: string;
  color: string;
  icon: 'star' | 'bolt' | 'heart' | 'trophy' | 'brush' | 'shield';
};

type SocialLink = {
  id: number;
  platform: string;
  handle: string;
  url: string;
  icon: 'twitter' | 'instagram' | 'youtube' | 'globe' | 'twitch';
};

// Placeholder profile data — this would come from the artist's account.
const PROFILE = {
  displayName: 'Artist Name',
  username: '@artistname',
  reputation: 89,
  memberSince: 'March 2024',
  commissionsCompleted: 67,
  avgSatisfaction: '5/5',
  about:
    "Hi! I'm a freelance illustrator specializing in character art, stylized portraits, and vibrant fantasy scenes. I've been drawing for over 8 years and love bringing original characters to life. My process is collaborative — you'll get updates at every phase, from sketch to final render. Feel free to reach out before purchasing if you have questions about your idea!",
};

const LISTINGS: Listing[] = [
  { id: 1, title: 'Full Character Render', price: 120, tags: ['Digital Art', 'Illustration'] },
  { id: 2, title: 'Stylized Portrait', price: 85, tags: ['Digital Art'] },
  { id: 3, title: 'Chibi Commission', price: 35, tags: ['Illustration'] },
  { id: 4, title: 'Sketch Bust', price: 25, tags: ['Sketch'] },
  { id: 5, title: 'Fantasy Scene', price: 200, tags: ['Painting', 'Digital Art'] },
];

const BADGES: Badge[] = [
  { id: 1, name: 'Top Seller', description: 'Completed 50+ commissions', color: 'var(--yellow)', icon: 'trophy' },
  { id: 2, name: 'Fast Responder', description: 'Replies within 24 hours', color: 'var(--blue)', icon: 'bolt' },
  { id: 3, name: 'Fan Favorite', description: 'Consistently high ratings', color: 'var(--pink)', icon: 'heart' },
  { id: 4, name: 'Verified Artist', description: 'Identity verified by CommIt', color: 'var(--green)', icon: 'shield' },
  { id: 5, name: 'Rising Star', description: 'Trending on the marketplace', color: 'var(--orange)', icon: 'star' },
  { id: 6, name: 'Master Brush', description: '1 year of active commissions', color: 'var(--purple)', icon: 'brush' },
];

const SOCIALS: SocialLink[] = [
  { id: 1, platform: 'Twitter / X', handle: '@artistname', url: 'https://x.com', icon: 'twitter' },
  { id: 2, platform: 'Instagram', handle: '@artistname.art', url: 'https://instagram.com', icon: 'instagram' },
  { id: 3, platform: 'YouTube', handle: 'ArtistName Speedpaints', url: 'https://youtube.com', icon: 'youtube' },
  { id: 4, platform: 'Twitch', handle: 'artistname_live', url: 'https://twitch.tv', icon: 'twitch' },
  { id: 5, platform: 'Portfolio', handle: 'artistname.art', url: 'https://example.com', icon: 'globe' },
];

// Simple inline icon set so badges and socials don't need an icon library.
const Icon: React.FC<{ name: Badge['icon'] | SocialLink['icon']; size?: number }> = ({
  name,
  size = 20,
}) => {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    'aria-hidden': true as const,
  };
  switch (name) {
    case 'star':
      return (
        <svg {...common}>
          <path d="M12 2l2.9 6.26L21.5 9.3l-4.75 4.4 1.15 6.8L12 17.2l-5.9 3.3 1.15-6.8L2.5 9.3l6.6-1.04L12 2z" />
        </svg>
      );
    case 'bolt':
      return (
        <svg {...common}>
          <path d="M13 2L4.5 13.5H11L9.5 22 19 10h-6.5L13 2z" />
        </svg>
      );
    case 'heart':
      return (
        <svg {...common}>
          <path d="M12 21s-7.5-4.9-9.7-9.1C.8 8.9 2.4 5.5 5.6 5.1c1.9-.3 3.7.6 4.7 2.1H12h1.7c1-1.5 2.8-2.4 4.7-2.1 3.2.4 4.8 3.8 3.3 6.8C19.5 16.1 12 21 12 21z" />
        </svg>
      );
    case 'trophy':
      return (
        <svg {...common}>
          <path d="M6 2h12v2h3v3a5 5 0 01-4.5 4.97A6 6 0 0113 15.9V18h3v2H8v-2h3v-2.1a6 6 0 01-3.5-3.93A5 5 0 013 7V4h3V2zm-1 4v1a3 3 0 002 2.83V6H5zm14 0h-2v3.83A3 3 0 0019 7V6z" />
        </svg>
      );
    case 'brush':
      return (
        <svg {...common}>
          <path d="M20.7 3.3a2.4 2.4 0 00-3.4 0l-8 8 3.4 3.4 8-8a2.4 2.4 0 000-3.4zM8 13.5c-2 0-3.5 1.5-3.5 3.5 0 1.5-1 2.5-2.5 2.5 1 1.5 2.7 2.5 4.5 2.5a5 5 0 005-5L8 13.5z" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 2l8 3v6c0 5.25-3.4 9.74-8 11-4.6-1.26-8-5.75-8-11V5l8-3zm-1.2 13.2l5.7-5.7-1.4-1.4-4.3 4.3-1.9-1.9-1.4 1.4 3.3 3.3z" />
        </svg>
      );
    case 'twitter':
      return (
        <svg {...common}>
          <path d="M18.9 2H22l-6.8 7.8L23.3 22h-6.3l-4.9-6.4L6.5 22H3.4l7.3-8.3L1 2h6.4l4.4 5.9L18.9 2zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg {...common}>
          <path d="M12 2.2c3.2 0 3.6 0 4.9.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.9.1-3.2 0-3.6 0-4.8-.1-3.3-.1-4.8-1.7-4.9-4.9-.1-1.3-.1-1.6-.1-4.8s0-3.6.1-4.8C2.4 4 4 2.4 7.2 2.3c1.2-.1 1.6-.1 4.8-.1zM12 7a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6zm5.2-3.4a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg {...common}>
          <path d="M23 12s0-3.85-.5-5.7a2.9 2.9 0 00-2-2C18.6 3.8 12 3.8 12 3.8s-6.6 0-8.5.5a2.9 2.9 0 00-2 2C1 8.15 1 12 1 12s0 3.85.5 5.7a2.9 2.9 0 002 2c1.9.5 8.5.5 8.5.5s6.6 0 8.5-.5a2.9 2.9 0 002-2c.5-1.85.5-5.7.5-5.7zM9.8 15.6V8.4l6.2 3.6-6.2 3.6z" />
        </svg>
      );
    case 'twitch':
      return (
        <svg {...common}>
          <path d="M4.3 2L3 5.6v14.5h5V22h2.7l2.4-2h3.7L21 15.9V2H4.3zm14.9 13l-2.7 2.7h-4.3l-2.4 2v-2H6V3.8h13.2V15zm-3.4-7.4v5.3H14V7.6h1.8zm-4.8 0v5.3H9.2V7.6H11z" />
        </svg>
      );
    case 'globe':
      return (
        <svg {...common}>
          <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm7.9 9h-3.4a15.7 15.7 0 00-1.2-5.6A8 8 0 0119.9 11zM12 4.2c.9 1.2 1.9 3.5 2.2 6.8H9.8c.3-3.3 1.3-5.6 2.2-6.8zM8.7 5.4A15.7 15.7 0 007.5 11H4.1a8 8 0 014.6-5.6zM4.1 13h3.4c.1 2.1.6 4 1.2 5.6A8 8 0 014.1 13zM12 19.8c-.9-1.2-1.9-3.5-2.2-6.8h4.4c-.3 3.3-1.3 5.6-2.2 6.8zm3.3-1.2a15.7 15.7 0 001.2-5.6h3.4a8 8 0 01-4.6 5.6z" />
        </svg>
      );
    default:
      return null;
  }
};

const ArtistProfile: React.FC = () => {
  return (
    <div className="profile-page">
      <Background direction="diagonal" speed={0.3} borderColor="rgba(0, 0, 0, 0.05)" />

      <Navbar />

      <div className="pf-body">
        {/* Left column: identity card */}
        <div className="pf-left">
          <div className="pf-identity-card">
            {/* Profile picture placeholder */}
            <div className="pf-avatar" role="img" aria-label="Profile picture of Artist Name">
              <svg width="72" height="72" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5.33 0-8 2.67-8 6v2h16v-2c0-3.33-2.67-6-8-6z" />
              </svg>
            </div>

            <h1 className="pf-display-name">{PROFILE.displayName}</h1>
            <span className="pf-username">{PROFILE.username}</span>

            {/* Reputation meter */}
            <div className="pf-reputation">
              <span className="pf-rep-label">{PROFILE.reputation}/100 Reputation</span>
              <div
                className="pf-rep-bar"
                role="progressbar"
                aria-valuenow={PROFILE.reputation}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Artist reputation"
              >
                <div
                  className="pf-rep-bar-fill"
                  style={{
                    width: `${PROFILE.reputation}%`,
                    backgroundColor: `hsl(${PROFILE.reputation * 1.2}, 75%, 45%)`,
                  }}
                />
              </div>
            </div>

            <dl className="pf-stats">
              <div className="pf-stat">
                <dt>Member Since</dt>
                <dd>{PROFILE.memberSince}</dd>
              </div>
              <div className="pf-stat">
                <dt>Completed</dt>
                <dd>{PROFILE.commissionsCompleted}</dd>
              </div>
              <div className="pf-stat">
                <dt>Avg. Satisfaction</dt>
                <dd>{PROFILE.avgSatisfaction}</dd>
              </div>
            </dl>
          </div>

          {/* Social links */}
          <section className="pf-panel pf-socials">
            <h2 className="pf-panel-title">Links</h2>
            <ul className="pf-social-list">
              {SOCIALS.map((social) => (
                <li key={social.id}>
                  <a
                    className="pf-social-link"
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="pf-social-icon">
                      <Icon name={social.icon} size={18} />
                    </span>
                    <span className="pf-social-meta">
                      <span className="pf-social-platform">{social.platform}</span>
                      <span className="pf-social-handle">{social.handle}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Right column: about, badges, gallery */}
        <div className="pf-right">
          {/* About me */}
          <section className="pf-panel">
            <h2 className="pf-panel-title">About Me</h2>
            <p className="pf-about-text">{PROFILE.about}</p>
          </section>

          {/* Badges */}
          <section className="pf-panel">
            <h2 className="pf-panel-title">Badges</h2>
            <ul className="pf-badge-grid">
              {BADGES.map((badge) => (
                <li
                  className="pf-badge"
                  key={badge.id}
                  style={{ '--badge-color': badge.color } as React.CSSProperties}
                >
                  <span className="pf-badge-icon">
                    <Icon name={badge.icon} size={22} />
                  </span>
                  <span className="pf-badge-meta">
                    <span className="pf-badge-name">{badge.name}</span>
                    <span className="pf-badge-desc">{badge.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Current listings gallery */}
          <section className="pf-panel">
            <h2 className="pf-panel-title">Open Commissions</h2>
            <div className="pf-gallery" role="list" aria-label="Open commission listings">
              {LISTINGS.map((listing) => (
                <a
                  className="pf-card"
                  href={`/commission?id=${listing.id}`}
                  key={listing.id}
                  role="listitem"
                  aria-label={`View details for ${listing.title}`}
                >
                  {/* Thumbnail placeholder */}
                  <div className="pf-thumb" aria-hidden="true" />
                  <div className="pf-card-meta">
                    <span className="pf-card-title">{listing.title}</span>
                    <span className="pf-card-price">${listing.price}</span>
                    <span className="pf-card-tags">
                      {listing.tags.map((tag) => (
                        <span className="pf-tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ArtistProfile;
