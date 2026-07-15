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
  type MessageAttachment,
} from '../lib/messages';
import {
  fetchArtistOrdersWithBuyer,
  payPhasePayment,
  phaseDue,
  requestPhasePayment,
  uploadMessageFile,
  type Order,
} from '../lib/orders';
import { useMyProfile } from '../hooks/useMyProfile';
import { supabase } from '../lib/supabase';
import '../styles/styles.css';
import '../styles/messages.css';

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

  /** Files staged for the next message. */
  const [pendingFiles, setPendingFiles] = React.useState<File[]>([]);
  /** In-progress orders where the viewer is the artist and the other user is the buyer. */
  const [artistOrders, setArtistOrders] = React.useState<Order[]>([]);
  /** Payment-request form state (artist side). */
  const [payFormOpen, setPayFormOpen] = React.useState(false);
  const [payFormOrderId, setPayFormOrderId] = React.useState<string>('');
  const [snapshotFile, setSnapshotFile] = React.useState<File | null>(null);
  const [payNote, setPayNote] = React.useState('');
  const [requestingPayment, setRequestingPayment] = React.useState(false);
  /** Which payment-request message is currently being paid (buyer side). */
  const [payingId, setPayingId] = React.useState<string | null>(null);

  const { mutate: mutateMyProfile } = useMyProfile();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const snapshotInputRef = React.useRef<HTMLInputElement>(null);
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

  // When a thread opens, check whether the viewer is the artist on any
  // in-progress order with the other participant (enables "Request Payment").
  const otherUserId = active?.other.id ?? null;
  React.useEffect(() => {
    if (!viewerId || !otherUserId) {
      setArtistOrders([]);
      return;
    }
    let cancelled = false;
    fetchArtistOrdersWithBuyer(viewerId, otherUserId)
      .then((orders) => {
        if (!cancelled) setArtistOrders(orders.filter((o) => o.paid_credits < o.total_price));
      })
      .catch(() => {
        if (!cancelled) setArtistOrders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [viewerId, otherUserId, messages.length]);

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
    const files = pendingFiles;
    if (!body && files.length === 0) return;

    setSending(true);
    setDraft('');

    // Upload staged files first, then attach their public URLs to the message.
    const attachments: MessageAttachment[] = [];
    for (const file of files) {
      const { url, error: uploadError } = await uploadMessageFile(viewerId, file);
      if (uploadError || !url) {
        setSending(false);
        setDraft(body);
        setError(uploadError ?? `Failed to upload ${file.name}.`);
        return;
      }
      attachments.push({ url, name: file.name, type: file.type, size: file.size });
    }

    const { message, error: sendError } = await sendMessage(activeId, viewerId, body, attachments);
    setSending(false);

    if (sendError || !message) {
      setDraft(body);
      setError(sendError ?? 'Message failed to send.');
      return;
    }
    setError(null);
    setPendingFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    refreshList();
  };

  const handleFilesChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(e.target.files ?? []);
    if (chosen.length === 0) return;
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB per file
    const tooBig = chosen.filter((f) => f.size > MAX_SIZE);
    if (tooBig.length > 0) {
      setError(`Files must be under 10 MB: ${tooBig.map((f) => f.name).join(', ')}`);
      return;
    }
    setError(null);
    setPendingFiles((prev) => [...prev, ...chosen].slice(0, 5));
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /** Artist: send a payment request with a required progress snapshot. */
  const handleRequestPayment = async () => {
    if (!viewerId || requestingPayment) return;
    const order = artistOrders.find((o) => o.id === payFormOrderId) ?? artistOrders[0];
    if (!order) return;
    if (!snapshotFile) {
      setError('A progress snapshot image is required to request a payment.');
      return;
    }

    setRequestingPayment(true);
    setError(null);
    const { url, error: uploadError } = await uploadMessageFile(viewerId, snapshotFile);
    if (uploadError || !url) {
      setRequestingPayment(false);
      setError(uploadError ?? 'Snapshot failed to upload.');
      return;
    }
    const { error: reqError } = await requestPhasePayment(order.id, url, payNote);
    setRequestingPayment(false);
    if (reqError) {
      setError(reqError);
      return;
    }
    setPayFormOpen(false);
    setSnapshotFile(null);
    setPayNote('');
    if (snapshotInputRef.current) snapshotInputRef.current.value = '';
    if (activeId) fetchMessages(activeId).then(setMessages).catch(() => {});
    refreshList();
  };

  /** Buyer: pay a pending payment request. */
  const handlePay = async (messageId: string) => {
    if (payingId) return;
    setPayingId(messageId);
    setError(null);
    const { error: payError } = await payPhasePayment(messageId);
    setPayingId(null);
    if (payError) {
      setError(payError);
      return;
    }
    mutateMyProfile();
    if (activeId) fetchMessages(activeId).then(setMessages).catch(() => {});
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
                {artistOrders.length > 0 && (
                  <button
                    type="button"
                    className="msg-request-btn"
                    onClick={() => {
                      setPayFormOpen((v) => !v);
                      setPayFormOrderId(artistOrders[0].id);
                    }}
                  >
                    {payFormOpen ? 'Cancel' : 'Request Payment'}
                  </button>
                )}
              </header>

              {payFormOpen && artistOrders.length > 0 && (() => {
                const order = artistOrders.find((o) => o.id === payFormOrderId) ?? artistOrders[0];
                const nextPhase = order.phases_paid + 1;
                const due =
                  order.payment_type === 'installments'
                    ? phaseDue(order.total_price, order.phase_count, nextPhase)
                    : order.total_price - order.paid_credits;
                const fee = Math.max(1, Math.ceil(due * 0.1));
                const phaseLabel = order.phases[nextPhase - 1] ?? `Phase ${nextPhase}`;
                return (
                  <div className="msg-payform" aria-label="Request a phase payment">
                    {artistOrders.length > 1 && (
                      <label className="msg-payform-field">
                        <span>Commission</span>
                        <select
                          value={order.id}
                          onChange={(e) => setPayFormOrderId(e.target.value)}
                        >
                          {artistOrders.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.title}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <p className="msg-payform-summary">
                      {order.title} — {phaseLabel}: {due.toLocaleString()} credits (buyer pays{' '}
                      {(due + fee).toLocaleString()} incl. fee)
                    </p>
                    <label className="msg-payform-field">
                      <span>Progress snapshot (required)</span>
                      <input
                        ref={snapshotInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => setSnapshotFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <label className="msg-payform-field">
                      <span>Note (optional)</span>
                      <input
                        type="text"
                        value={payNote}
                        onChange={(e) => setPayNote(e.target.value)}
                        maxLength={300}
                        placeholder={`Payment requested for ${phaseLabel}`}
                      />
                    </label>
                    <button
                      type="button"
                      className="msg-pay-btn"
                      onClick={handleRequestPayment}
                      disabled={requestingPayment || !snapshotFile}
                    >
                      {requestingPayment ? 'Sending…' : 'Send Payment Request'}
                    </button>
                  </div>
                );
              })()}

              <div className="msg-scroll" ref={scrollRef}>
                {loadingThread ? (
                  <p className="msg-status">Loading messages…</p>
                ) : messages.length === 0 ? (
                  <p className="msg-status">This is the start of your conversation with {active.other.username}.</p>
                ) : (
                  messages.map((m, i) => {
                    const outgoing = m.sender_id === viewerId;

                    if (m.kind === 'system') {
                      return (
                        <React.Fragment key={m.id}>
                          {needsSeparator(messages[i - 1], m) && (
                            <div className="msg-separator">{formatSeparator(m.created_at)}</div>
                          )}
                          <div className="msg-system">{m.body}</div>
                        </React.Fragment>
                      );
                    }

                    if (m.kind === 'payment_request') {
                      const total = (m.payment_amount ?? 0) + (m.payment_fee ?? 0);
                      const isBuyer = !outgoing;
                      return (
                        <React.Fragment key={m.id}>
                          {needsSeparator(messages[i - 1], m) && (
                            <div className="msg-separator">{formatSeparator(m.created_at)}</div>
                          )}
                          <div className={`msg-row ${outgoing ? 'out' : 'in'}`}>
                            <div className="msg-payment-card">
                              <span className="msg-payment-label">Payment Request</span>
                              {m.snapshot_url && (
                                <a href={m.snapshot_url} target="_blank" rel="noreferrer">
                                  <img
                                    className="msg-payment-snapshot"
                                    src={m.snapshot_url || "/placeholder.svg"}
                                    alt="Progress snapshot"
                                    loading="lazy"
                                  />
                                </a>
                              )}
                              <p className="msg-payment-body">{m.body}</p>
                              <p className="msg-payment-amount">
                                {(m.payment_amount ?? 0).toLocaleString()} credits
                                <span className="msg-payment-fee">
                                  {' '}+ {(m.payment_fee ?? 0).toLocaleString()} fee = {total.toLocaleString()}
                                </span>
                              </p>
                              {m.payment_status === 'paid' ? (
                                <span className="msg-payment-paid">Paid</span>
                              ) : isBuyer ? (
                                <button
                                  type="button"
                                  className="msg-pay-btn"
                                  onClick={() => handlePay(m.id)}
                                  disabled={payingId === m.id}
                                >
                                  {payingId === m.id ? 'Paying…' : `Pay ${total.toLocaleString()} credits`}
                                </button>
                              ) : (
                                <span className="msg-payment-pending">Awaiting payment</span>
                              )}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    }

                    return (
                      <React.Fragment key={m.id}>
                        {needsSeparator(messages[i - 1], m) && (
                          <div className="msg-separator">{formatSeparator(m.created_at)}</div>
                        )}
                        <div className={`msg-row ${outgoing ? 'out' : 'in'}`}>
                          <div className="msg-bubble">
                            {m.attachments.length > 0 && (
                              <div className="msg-attachments">
                                {m.attachments.map((a) =>
                                  a.type.startsWith('image/') ? (
                                    <a key={a.url} href={a.url} target="_blank" rel="noreferrer">
                                      <img
                                        className="msg-attachment-img"
                                        src={a.url || "/placeholder.svg"}
                                        alt={a.name}
                                        loading="lazy"
                                      />
                                    </a>
                                  ) : (
                                    <a
                                      key={a.url}
                                      className="msg-attachment-file"
                                      href={a.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      download={a.name}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                                      </svg>
                                      {a.name}
                                    </a>
                                  ),
                                )}
                              </div>
                            )}
                            {m.body && <span>{m.body}</span>}
                          </div>
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

              {pendingFiles.length > 0 && (
                <div className="msg-pending-files" aria-label="Files to send">
                  {pendingFiles.map((f, i) => (
                    <span className="msg-pending-chip" key={`${f.name}-${i}`}>
                      {f.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(f) || "/placeholder.svg"} alt="" className="msg-pending-thumb" />
                      ) : null}
                      <span className="msg-pending-name">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => removePendingFile(i)}
                        aria-label={`Remove ${f.name}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="msg-composer">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.zip,.psd,.txt"
                  className="sr-only"
                  onChange={handleFilesChosen}
                  aria-label="Attach files"
                />
                <button
                  type="button"
                  className="msg-attach-btn"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach a file"
                  title="Attach a file"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>
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
                  disabled={sending || (draft.trim().length === 0 && pendingFiles.length === 0)}
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
