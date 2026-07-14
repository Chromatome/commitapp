import React from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import Navbar from '../components/Navbar';
import Background from '../components/Background';
import { useSession } from '../hooks/useSession';
import {
  createTypingChannel,
  fetchConversations,
  fetchMessages,
  getOrCreateConversation,
  markConversationRead,
  sendMessage,
  subscribeToIncomingMessages,
  subscribeToMessages,
  type ConversationSummary,
  type Message,
} from '../lib/messages';
import { supabase } from '../lib/supabase';
import '../styles/styles.css';
import '../styles/messages.css';
import LinkButton from '../components/LinkButton';

/** "Today 3:41 PM" / "Mon 9:02 AM" / "Jan 5, 2:15 PM" separators, old-SMS style. */
function formatSeparator(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (dayDiff === 0) return `Today ${time}`;
  if (dayDiff === 1) return `Yesterday ${time}`;
  if (dayDiff < 7) return `${date.toLocaleDateString([], { weekday: 'short' })} ${time}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}

function formatListTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (dayDiff === 0) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/** Insert a timestamp separator before messages that are >15 min apart. */
function needsSeparator(prev: Message | undefined, current: Message): boolean {
  if (!prev) return true;
  return new Date(current.created_at).getTime() - new Date(prev.created_at).getTime() > 15 * 60 * 1000;
}

const Messages: React.FC = () => {
  const { session, checking } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const viewerId = session?.user.id ?? null;
  const withId = searchParams.get('with');

  const [conversations, setConversations] = React.useState<ConversationSummary[]>([]);
  const [loadingList, setLoadingList] = React.useState(true);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [otherTyping, setOtherTyping] = React.useState(false);
  /** Mobile: show the thread pane instead of the inbox list. */
  const [mobileThreadOpen, setMobileThreadOpen] = React.useState(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const typingTimeoutRef = React.useRef<number | null>(null);
  const typingChannelRef = React.useRef<ReturnType<typeof createTypingChannel> | null>(null);
  const activeIdRef = React.useRef<string | null>(null);
  activeIdRef.current = activeId;

  const active = conversations.find((c) => c.id === activeId) ?? null;

  const refreshList = React.useCallback(async () => {
    if (!viewerId) return;
    try {
      const list = await fetchConversations(viewerId);
      setConversations(list);
    } catch {
      // Keep whatever list we had; transient errors surface on thread actions.
    }
  }, [viewerId]);

  // Initial load: fetch inbox, resolve ?with= deep link into a conversation.
  React.useEffect(() => {
    if (!viewerId) return;
    let cancelled = false;

    (async () => {
      setLoadingList(true);
      let list: ConversationSummary[] = [];
      try {
        list = await fetchConversations(viewerId);
      } catch {
        if (!cancelled) setError('Could not load your messages. Try refreshing.');
      }

      if (withId && withId !== viewerId) {
        const { id, error: convError } = await getOrCreateConversation(viewerId, withId);
        if (cancelled) return;
        if (id) {
          if (!list.some((c) => c.id === id)) {
            try {
              list = await fetchConversations(viewerId);
            } catch {
              /* list stays as-is */
            }
          }
          setConversations(list);
          setActiveId(id);
          setMobileThreadOpen(true);
          setLoadingList(false);
          return;
        }
        if (convError) setError(convError);
      }

      if (!cancelled) {
        setConversations(list);
        setLoadingList(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [viewerId, withId]);

  // Load the active thread + realtime subscription + typing channel.
  React.useEffect(() => {
    if (!viewerId || !activeId) return;
    let cancelled = false;

    setLoadingThread(true);
    setOtherTyping(false);

    fetchMessages(activeId)
      .then((msgs) => {
        if (cancelled) return;
        setMessages(msgs);
        setLoadingThread(false);
        markConversationRead(activeId, viewerId).then(() => refreshList());
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not load this conversation.');
          setLoadingThread(false);
        }
      });

    const channel = subscribeToMessages(activeId, {
      onInsert: (msg) => {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        setOtherTyping(false);
        if (msg.sender_id !== viewerId) {
          // Thread is open, so immediately mark it read.
          markConversationRead(activeId, viewerId);
        }
        refreshList();
      },
      onUpdate: (msg) => {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
      },
    });

    const typing = createTypingChannel(activeId, viewerId, () => {
      setOtherTyping(true);
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = window.setTimeout(() => setOtherTyping(false), 3000);
    });
    typingChannelRef.current = typing;

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      typing.unsubscribe();
      typingChannelRef.current = null;
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    };
  }, [viewerId, activeId, refreshList]);

  // Inbox-wide realtime: refresh list when a message arrives in a non-active thread.
  React.useEffect(() => {
    if (!viewerId) return;
    const channel = subscribeToIncomingMessages(viewerId, (msg) => {
      if (msg.conversation_id !== activeIdRef.current) refreshList();
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewerId, refreshList]);

  // Keep the thread scrolled to the newest message.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, otherTyping, loadingThread]);

  const openConversation = (id: string) => {
    setActiveId(id);
    setMobileThreadOpen(true);
    setError(null);
    // Clean the ?with= param once a thread is explicitly chosen.
    if (withId) setSearchParams({}, { replace: true });
  };

  const handleSend = async () => {
    if (!viewerId || !activeId || sending) return;
    const body = draft.trim();
    if (!body) return;

    setSending(true);
    setDraft('');
    const { message, error: sendError } = await sendMessage(activeId, viewerId, body);
    setSending(false);

    if (sendError || !message) {
      setDraft(body);
      setError(sendError ?? 'Message failed to send.');
      return;
    }
    setError(null);
    setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    refreshList();
  };

  const handleDraftKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      handleSend();
    }
  };

  const handleDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    typingChannelRef.current?.sendTyping();
  };

  if (checking) {
    return (
      <div className="messages-page">
        <Navbar />
        <p className="msg-status">Loading…</p>
      </div>
    );
  }

  if (!viewerId) return null; // RequireAuth handles redirect.

  // Index of the last outgoing message (receipt is shown under it).
  const lastOutgoingIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender_id === viewerId) return i;
    }
    return -1;
  })();

  return (
    <div className="messages-page">
      <Background direction="diagonal" speed={0.3} borderColor="rgba(0,0,0,0.06)" squareSize={56} shape="square" />

      <main className={`msg-shell ${mobileThreadOpen ? 'thread-open' : ''}`}>
        {/* ---------- Inbox list ---------- */}
        <section className="msg-inbox" aria-label="Conversations">
          <header className="msg-inbox-header">
            <a href="/">{"<"}</a>
            <h1>Messages</h1>
          </header>

          {loadingList ? (
            <p className="msg-status">Loading conversations…</p>
          ) : conversations.length === 0 ? (
            <div className="msg-empty">
              <p>No conversations yet.</p>
              <p className="msg-empty-hint">
                Visit an artist&apos;s profile and hit &quot;Message&quot; to start one.
              </p>
            </div>
          ) : (
            <ul className="msg-thread-list">
              {conversations.map((c) => {
                const isActive = c.id === activeId;
                const unread = c.unread_count > 0;
                const preview = c.last_message
                  ? `${c.last_message.sender_id === viewerId ? 'You: ' : ''}${c.last_message.body}`
                  : 'Say hi!';
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={`msg-thread-item ${isActive ? 'active' : ''} ${unread ? 'unread' : ''}`}
                      onClick={() => openConversation(c.id)}
                    >
                      <span className="msg-avatar" aria-hidden="true">
                        {c.other.avatar_url ? (
                          <img src={c.other.avatar_url} alt="" />
                        ) : (
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
                          </svg>
                        )}
                      </span>
                      <span className="msg-thread-meta">
                        <span className="msg-thread-top">
                          <span className="msg-thread-name">{c.other.username}</span>
                          <span className="msg-thread-time">{formatListTime(c.last_message?.created_at ?? c.last_message_at)}</span>
                        </span>
                        <span className="msg-thread-preview">{preview}</span>
                      </span>
                      {unread && (
                        <span className="msg-unread-dot">
                          <span className="sr-only">{c.unread_count} unread messages</span>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ---------- Thread ---------- */}
        <section className="msg-thread" aria-label="Conversation">
          {active ? (
            <>
              <header className="msg-thread-header">
                <button
                  type="button"
                  className="msg-back-btn"
                  onClick={() => setMobileThreadOpen(false)}
                  aria-label="Back to conversations"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="msg-thread-header-name"
                  onClick={() => navigate(`/profile?id=${active.other.id}`)}
                >
                  {active.other.username}
                </button>
              </header>

              <div className="msg-scroll" ref={scrollRef}>
                {loadingThread ? (
                  <p className="msg-status">Loading messages…</p>
                ) : messages.length === 0 ? (
                  <p className="msg-status">This is the start of your conversation with {active.other.username}.</p>
                ) : (
                  messages.map((m, i) => {
                    const outgoing = m.sender_id === viewerId;
                    return (
                      <React.Fragment key={m.id}>
                        {needsSeparator(messages[i - 1], m) && (
                          <div className="msg-separator">{formatSeparator(m.created_at)}</div>
                        )}
                        <div className={`msg-row ${outgoing ? 'out' : 'in'}`}>
                          <div className="msg-bubble">{m.body}</div>
                        </div>
                        {outgoing && i === lastOutgoingIndex && (
                          <div className="msg-receipt">{m.read_at ? 'Read' : 'Delivered'}</div>
                        )}
                      </React.Fragment>
                    );
                  })
                )}

                {otherTyping && (
                  <div className="msg-row in">
                    <div className="msg-bubble msg-typing" aria-label={`${active.other.username} is typing`}>
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}
              </div>

              {error && <p className="msg-error" role="alert">{error}</p>}

              <div className="msg-composer">
                <textarea
                  className="msg-input"
                  value={draft}
                  onChange={handleDraftChange}
                  onKeyDown={handleDraftKeyDown}
                  placeholder={`Message ${active.other.username}…`}
                  rows={1}
                  maxLength={2000}
                  aria-label="Type a message"
                />
                <button
                  type="button"
                  className="msg-send-btn"
                  onClick={handleSend}
                  disabled={sending || draft.trim().length === 0}
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="msg-thread-placeholder">
              <p>Select a conversation to start chatting.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Messages;
