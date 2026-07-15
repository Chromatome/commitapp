import { supabase } from './supabase';
import type { PaymentType } from './profileData';

/**
 * Data access for the credits purchasing system.
 * Backed by the Supabase schema:
 *   profiles.credits — every user's credit balance
 *   commissions.stock — remaining purchase spots (null = unlimited)
 *   orders(commission_id, buyer_id, artist_id, title, payment_type, phases,
 *          phase_count, phases_paid, total_price, paid_credits, total_fee,
 *          status, latest_snapshot_url)
 *   credit_ledger — audit trail of every credit movement
 * plus three security-definer RPCs that do all the money math atomically:
 *   purchase_commission(commission_id) -> order id
 *   request_phase_payment(order_id, snapshot_url, note) -> message id
 *   pay_phase_payment(message_id)
 */

export type OrderStatus = 'in_progress' | 'completed' | 'cancelled';

export type Order = {
  id: string;
  commission_id: string | null;
  buyer_id: string;
  artist_id: string;
  title: string;
  payment_type: PaymentType;
  phases: string[];
  phase_count: number;
  phases_paid: number;
  total_price: number;
  paid_credits: number;
  total_fee: number;
  status: OrderStatus;
  latest_snapshot_url: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderWithProfiles = Order & {
  buyer: { id: string; username: string; avatar_url: string | null } | null;
  artist: { id: string; username: string; avatar_url: string | null } | null;
};

/** 10% platform fee, minimum 1 credit, added on top of the buyer's total. */
export function creditFee(amount: number): number {
  return Math.max(1, Math.ceil(amount * 0.1));
}

/** Amount due for phase n (1-based) of `count`, distributing remainders (mirrors the SQL helper). */
export function phaseDue(price: number, count: number, n: number): number {
  return Math.floor((price * n) / count) - Math.floor((price * (n - 1)) / count);
}

/**
 * What the buyer owes at checkout for a commission, per payment type:
 * upfront = full price; installments = first phase; split = upfront percent.
 */
export function upfrontDue(
  price: number,
  paymentType: PaymentType,
  phaseCount: number,
  splitUpfrontPercent: number | null,
): number {
  if (paymentType === 'installments') return phaseDue(price, Math.max(phaseCount, 1), 1);
  if (paymentType === 'split') return Math.ceil((price * (splitUpfrontPercent ?? 50)) / 100);
  return price;
}

/** Atomically purchase a commission. Returns the new order id. */
export async function purchaseCommission(
  commissionId: string,
): Promise<{ orderId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('purchase_commission', {
    p_commission_id: commissionId,
  });
  if (error) return { orderId: null, error: error.message };
  return { orderId: data as string, error: null };
}

/** Fetch a single order (RLS: only the buyer or artist can see it). */
export async function fetchOrder(orderId: string): Promise<OrderWithProfiles | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      '*, buyer:profiles!orders_buyer_id_fkey(id, username, avatar_url), artist:profiles!orders_artist_id_fkey(id, username, avatar_url)',
    )
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return normalizeOrder(data);
}

/** All in-progress orders where the viewer is the artist (dashboard), newest activity first. */
export async function fetchArtistOrders(artistId: string): Promise<OrderWithProfiles[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      '*, buyer:profiles!orders_buyer_id_fkey(id, username, avatar_url), artist:profiles!orders_artist_id_fkey(id, username, avatar_url)',
    )
    .eq('artist_id', artistId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeOrder);
}

/** In-progress orders between two specific users where the viewer is the artist. */
export async function fetchArtistOrdersWithBuyer(
  artistId: string,
  buyerId: string,
): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('artist_id', artistId)
    .eq('buyer_id', buyerId)
    .eq('status', 'in_progress')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => normalizeOrder(row) as Order);
}

function normalizeOrder(row: Record<string, unknown>): OrderWithProfiles {
  return {
    ...(row as unknown as OrderWithProfiles),
    phases: Array.isArray(row.phases) ? (row.phases as string[]) : [],
    total_price: Number(row.total_price),
    paid_credits: Number(row.paid_credits),
    total_fee: Number(row.total_fee),
  };
}

/**
 * Artist requests the next phase payment. A progress snapshot image is
 * required — upload it first with `uploadMessageFile`, then pass its URL.
 * Returns the payment-request message id.
 */
export async function requestPhasePayment(
  orderId: string,
  snapshotUrl: string,
  note: string,
): Promise<{ messageId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('request_phase_payment', {
    p_order_id: orderId,
    p_snapshot_url: snapshotUrl,
    p_note: note,
  });
  if (error) return { messageId: null, error: error.message };
  return { messageId: data as string, error: null };
}

/** Buyer pays a pending payment request message. */
export async function payPhasePayment(messageId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('pay_phase_payment', { p_message_id: messageId });
  return { error: error ? error.message : null };
}

/**
 * Upload a file to the public `message-attachments` bucket
 * ({userId}/... — RLS restricts writes to the uploader's folder).
 * Used for both chat attachments and progress snapshots.
 */
export async function uploadMessageFile(
  userId: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('message-attachments')
    .upload(path, file, { cacheControl: '3600' });
  if (uploadError) return { url: null, error: uploadError.message };

  const { data } = supabase.storage.from('message-attachments').getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
