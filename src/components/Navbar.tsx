import React from 'react';
import { Link, useNavigate } from 'react-router';
import '../styles/styles.css';
import logo from "../assets/commitsticker.png";
import { logOut } from '../lib/auth';
import { useSession } from '../hooks/useSession';
import { useMyProfile } from '../hooks/useMyProfile';
import {
  fetchConversations,
  fetchUnreadConversationCount,
  subscribeToIncomingMessages,
  type ConversationSummary,
} from '../lib/messages';
import { supabase } from '../lib/supabase';

/** Same "old-SMS style" short time label used on the messages page. */
function formatPreviewTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (dayDiff === 0) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useSession();
  const viewerId = session?.user?.id ?? null;
  const { profile: myProfile } = useMyProfile();

  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const [notifOpen, setNotifOpen] = React.useState(false);
  const notifRef = React.useRef<HTMLDivElement>(null);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [previews, setPreviews] = React.useState<ConversationSummary[]>([]);
  const [loadingPreviews, setLoadingPreviews] = React.useState(false);

  // Close the account dropdown when clicking outside or pressing Escape.
  React.useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  // Close the notifications dropdown when clicking outside or pressing Escape.
  React.useEffect(() => {
    if (!notifOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotifOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [notifOpen]);

  // Keep the unread badge current: initial load + realtime updates whenever
  // a message lands in any of the viewer's conversations.
  React.useEffect(() => {
    if (!viewerId) {
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    fetchUnreadConversationCount(viewerId).then((count) => {
      if (!cancelled) setUnreadCount(count);
    });

    const channel = subscribeToIncomingMessages(viewerId, () => {
      fetchUnreadConversationCount(viewerId).then((count) => {
        if (!cancelled) setUnreadCount(count);
      });
      // Refresh the open preview list too, so a new message shows up live.
      if (notifRef.current) {
        fetchConversations(viewerId).then((list) => {
          if (!cancelled) setPreviews(list.slice(0, 5));
        });
      }
    });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerId]);

  const toggleNotifications = () => {
    if (!viewerId) {
      navigate('/login');
      return;
    }
    setNotifOpen((open) => {
      const next = !open;
      if (next) {
        setLoadingPreviews(true);
        fetchConversations(viewerId)
          .then((list) => setPreviews(list.slice(0, 5)))
          .finally(() => setLoadingPreviews(false));
      }
      return next;
    });
  };

  const openConversation = (otherId: string) => {
    setNotifOpen(false);
    navigate(`/messages?with=${otherId}`);
  };

  const handleLogOut = async () => {
    setMenuOpen(false);
    await logOut();
    navigate('/');
  };

  return (
    <header className="navbar">
      <a className="n-logo" href="/" aria-label="CommIt home">
        <img 
          src={logo} 
          alt="CommIt logo" 
          className="n-logo-img"
      />
      </a>

      <div className="n-header-right">
        <div className="n-credits">
          Credits: {(myProfile?.credits ?? 0).toLocaleString()}
          <button
            type="button"
            className="n-buy-credits"
            onClick={() => navigate('/marketplace')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="sr-only">Buy credits</span>
          </button>
        </div>

        <div className="n-notif" ref={notifRef}>
          <button
            type="button"
            className="n-notif-btn"
            aria-haspopup="menu"
            aria-expanded={notifOpen}
            onClick={toggleNotifications}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            {unreadCount > 0 && (
              <span className="n-notif-badge" aria-hidden="true" />
            )}
            <span className="sr-only">
              Messages{unreadCount > 0 ? ` (${unreadCount} unread)` : ''}
            </span>
          </button>

          {notifOpen && (
            <nav className="n-dropdown n-notif-dropdown" role="menu" aria-label="Message notifications">
              {loadingPreviews ? (
                <p className="n-notif-status">Loading…</p>
              ) : previews.length === 0 ? (
                <p className="n-notif-status">No conversations yet.</p>
              ) : (
                previews.map((c) => {
                  const unread = c.unread_count > 0;
                  const preview = c.last_message
                    ? `${c.last_message.sender_id === viewerId ? 'You: ' : ''}${c.last_message.body}`
                    : 'Say hi!';
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="menuitem"
                      className={`n-notif-item ${unread ? 'unread' : ''}`}
                      onClick={() => openConversation(c.other.id)}
                    >
                      <span className="n-notif-avatar" aria-hidden="true">
                        {c.other.avatar_url ? (
                          <img src={c.other.avatar_url} alt="" />
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
                          </svg>
                        )}
                      </span>
                      <span className="n-notif-item-meta">
                        <span className="n-notif-item-top">
                          <span className="n-notif-item-name">{c.other.username}</span>
                          <span className="n-notif-item-time">
                            {formatPreviewTime(c.last_message?.created_at ?? c.last_message_at)}
                          </span>
                        </span>
                        <span className="n-notif-item-preview">{preview}</span>
                      </span>
                      {unread && <span className="n-notif-item-dot" aria-hidden="true" />}
                    </button>
                  );
                })
              )}
              <div className="n-dropdown-divider" role="separator" />
              <Link
                to="/messages"
                className="n-dropdown-item"
                role="menuitem"
                onClick={() => setNotifOpen(false)}
              >
                View all messages
              </Link>
            </nav>
          )}
        </div>

        <div className="n-menu" ref={menuRef}>
          <button
            type="button"
            className="n-menu-btn"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="n-menu-avatar" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
              </svg>
            </span>
            <span className="n-menu-caret" aria-hidden="true">▾</span>
            <span className="sr-only">Account menu</span>
          </button>

          {menuOpen && (
            <nav className="n-dropdown" role="menu" aria-label="Account">
              <Link
                to="/profile"
                className="n-dropdown-item"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </Link>
              <Link
                to="/dashboard"
                className="n-dropdown-item"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                Artist Dashboard
              </Link>
              <Link
                to="/settings"
                className="n-dropdown-item"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                Settings
              </Link>
              <div className="n-dropdown-divider" role="separator" />
              <button
                type="button"
                className="n-dropdown-item n-dropdown-logout"
                role="menuitem"
                onClick={handleLogOut}
              >
                Log Out
              </button>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
