import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Data access for one-on-one direct messaging between artists.
 * Backed by the Supabase schema:
 *   conversations(id, participant_a, participant_b, created_at, last_message_at)
 *     — one row per artist pair (participant_a < participant_b, unique pair)
 *   messages(id, conversation_id, sender_id, body, created_at, read_at)
 * RLS restricts everything to conversation participants; realtime is enabled
 * on `messages` for INSERTs (new messages) and UPDATEs (read receipts).
 */

export type MessageAttachment = {
  url: string;
  name: string;
  type: string;
  size: number;
};

export type MessageKind = 'text' | 'payment_request' | 'system';

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  /** 'text' = normal chat, 'payment_request' = artist asking for a phase payment, 'system' = purchase receipts. */
  kind: MessageKind;
  attachments: MessageAttachment[];
  order_id: string | null;
  payment_amount: number | null;
  payment_fee: number | null;
  payment_status: 'pending' | 'paid' | null;
  snapshot_url: string | null;
};

const MESSAGE_COLUMNS =
  'id, conversation_id, sender_id, body, created_at, read_at, kind, attachments, order_id, payment_amount, payment_fee, payment_status, snapshot_url';

export type ConversationSummary = {
  id: string;
  /** The other artist in the conversation. */
  other: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  last_message: Pick<Message, 'body' | 'sender_id' | 'created_at'> | null;
  last_message_at: string;
  unread_count: number;
};

/** Normalize a pair of profile ids into (a, b) with a < b, matching the DB constraint. */
function orderPair(x: string, y: string): [string, string] {
  return x < y ? [x, y] : [y, x];
}

/**
 * Find the existing conversation between the viewer and another artist,
 * or create it. Returns the conversation id.
 */
export async function getOrCreateConversation(
  viewerId: string,
  otherId: string,
): Promise<{ id: string | null; error: string | null }> {
  if (viewerId === otherId) return { id: null, error: 'You cannot message yourself.' };
  const [a, b] = orderPair(viewerId, otherId);

  const { data: existing, error: findError } = await supabase
    .from('conversations')
    .select('id')
    .eq('participant_a', a)
    .eq('participant_b', b)
    .maybeSingle();
  if (findError) return { id: null, error: findError.message };
  if (existing) return { id: existing.id, error: null };

  const { data: created, error: insertError } = await supabase
    .from('conversations')
    .insert({ participant_a: a, participant_b: b })
    .select('id')
    .single();
  if (insertError) {
    // Unique-violation race: another tab/client created it first — re-fetch.
    const { data: raced } = await supabase
      .from('conversations')
      .select('id')
      .eq('participant_a', a)
      .eq('participant_b', b)
      .maybeSingle();
    if (raced) return { id: raced.id, error: null };
    return { id: null, error: insertError.message };
  }
  return { id: created.id, error: null };
}

/**
 * Fetch the viewer's inbox: all conversations with the other artist's profile,
 * the latest message preview, and an unread count, newest activity first.
 */
export async function fetchConversations(viewerId: string): Promise<ConversationSummary[]> {
  const { data: convos, error } = await supabase
    .from('conversations')
    .select(
      'id, participant_a, participant_b, last_message_at, a:profiles!conversations_participant_a_fkey(id, username, avatar_url), b:profiles!conversations_participant_b_fkey(id, username, avatar_url)',
    )
    .or(`participant_a.eq.${viewerId},participant_b.eq.${viewerId}`)
    .order('last_message_at', { ascending: false });
  if (error) throw new Error(error.message);
  if (!convos || convos.length === 0) return [];

  const ids = convos.map((c) => c.id);

  // Latest message + unread counts for all conversations in two queries.
  const [msgRes, unreadRes] = await Promise.all([
    supabase
      .from('messages')
      .select('conversation_id, body, sender_id, created_at')
      .in('conversation_id', ids)
      .order('created_at', { ascending: false }),
    supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', ids)
      .neq('sender_id', viewerId)
      .is('read_at', null),
  ]);
  if (msgRes.error) throw new Error(msgRes.error.message);
  if (unreadRes.error) throw new Error(unreadRes.error.message);

  const latestByConvo = new Map<string, { body: string; sender_id: string; created_at: string }>();
  for (const m of msgRes.data ?? []) {
    if (!latestByConvo.has(m.conversation_id)) {
      latestByConvo.set(m.conversation_id, m);
    }
  }
  const unreadByConvo = new Map<string, number>();
  for (const m of unreadRes.data ?? []) {
    unreadByConvo.set(m.conversation_id, (unreadByConvo.get(m.conversation_id) ?? 0) + 1);
  }

  return convos.map((c) => {
    const row = c as unknown as {
      id: string;
      participant_a: string;
      participant_b: string;
      last_message_at: string;
      a: { id: string; username: string; avatar_url: string | null } | null;
      b: { id: string; username: string; avatar_url: string | null } | null;
    };
    const other = row.participant_a === viewerId ? row.b : row.a;
    return {
      id: row.id,
      other: {
        id: other?.id ?? '',
        username: other?.username ?? 'Unknown Artist',
        avatar_url: other?.avatar_url ?? null,
      },
      last_message: latestByConvo.get(row.id) ?? null,
      last_message_at: row.last_message_at,
      unread_count: unreadByConvo.get(row.id) ?? 0,
    };
  });
}

/** Fetch a thread's messages, oldest first. */
export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Message[];
}

/** Send a message (optionally with file attachments) and bump the conversation's last activity timestamp. */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
  attachments: MessageAttachment[] = [],
): Promise<{ message: Message | null; error: string | null }> {
  const trimmed = body.trim();
  if (!trimmed && attachments.length === 0) {
    return { message: null, error: 'Message cannot be empty.' };
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body: trimmed,
      attachments,
    })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error) return { message: null, error: error.message };

  await supabase
    .from('conversations')
    .update({ last_message_at: data.created_at })
    .eq('id', conversationId);

  return { message: data as Message, error: null };
}

/** Mark all unread incoming messages in a conversation as read (read receipt). */
export async function markConversationRead(
  conversationId: string,
  viewerId: string,
): Promise<void> {
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', viewerId)
    .is('read_at', null);
}

/** Count conversations with at least one unread incoming message (for the navbar dot). */
export async function fetchUnreadConversationCount(viewerId: string): Promise<number> {
  const { data, error } = await supabase
    .from('messages')
    .select('conversation_id')
    .neq('sender_id', viewerId)
    .is('read_at', null);
  if (error) return 0;
  return new Set((data ?? []).map((m) => m.conversation_id)).size;
}

/**
 * Subscribe to realtime INSERTs (new messages) and UPDATEs (read receipts)
 * for one conversation. Returns the channel; call `supabase.removeChannel` to clean up.
 */
export function subscribeToMessages(
  conversationId: string,
  handlers: {
    onInsert: (message: Message) => void;
    onUpdate: (message: Message) => void;
  },
): RealtimeChannel {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => handlers.onInsert(payload.new as Message),
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => handlers.onUpdate(payload.new as Message),
    )
    .subscribe();
}

/**
 * Subscribe to incoming messages across ALL of the viewer's conversations
 * (used for the navbar unread dot and inbox refresh). Client-side filtered:
 * only messages sent by someone else are reported.
 */
export function subscribeToIncomingMessages(
  viewerId: string,
  onIncoming: (message: Message) => void,
): RealtimeChannel {
  return supabase
    .channel(`incoming:${viewerId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        const msg = payload.new as Message;
        if (msg.sender_id !== viewerId) onIncoming(msg);
      },
    )
    .subscribe();
}

/**
 * Typing indicator over a Supabase broadcast channel (no rows written).
 * Returns a throttled `sendTyping` plus `unsubscribe` cleanup.
 */
export function createTypingChannel(
  conversationId: string,
  viewerId: string,
  onTyping: (fromId: string) => void,
): { sendTyping: () => void; unsubscribe: () => void } {
  const channel = supabase.channel(`typing:${conversationId}`, {
    config: { broadcast: { self: false } },
  });

  channel
    .on('broadcast', { event: 'typing' }, (payload) => {
      const from = (payload.payload as { from?: string })?.from;
      if (from && from !== viewerId) onTyping(from);
    })
    .subscribe();

  let lastSent = 0;
  const sendTyping = () => {
    const now = Date.now();
    if (now - lastSent < 1500) return;
    lastSent = now;
    channel.send({ type: 'broadcast', event: 'typing', payload: { from: viewerId } });
  };

  return {
    sendTyping,
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
