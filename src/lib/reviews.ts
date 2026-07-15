import { supabase } from './supabase';

/**
 * Data access for leaving reviews on commissions.
 * Backed by the Supabase migration in supabase/migrations/20260715120000_commission_reviews.sql:
 *   commission_reviews now also carries order_id + reviewer_id, with a unique
 *   index on order_id (one review per order) and RLS that blocks direct
 *   inserts/updates from clients.
 *   submit_commission_review(order_id, rating, text) — security-definer RPC
 *   that verifies the caller is the order's buyer and that the order is
 *   fully paid off (status = 'completed') before inserting the review, then
 *   recalculates the artist's reputation via recalculate_artist_reputation.
 */

export type ReviewEligibility = {
  /** The buyer's completed (fully paid) order for this commission. */
  orderId: string;
  /** Whether that order already has a review attached. */
  alreadyReviewed: boolean;
};

/**
 * Checks whether the signed-in buyer has a fully-paid-off order for this
 * commission, and if so, whether they've already reviewed it.
 * Returns null when the buyer has no completed order for this commission
 * (nothing to review yet — still in progress, cancelled, or never bought).
 */
export async function fetchReviewEligibility(
  commissionId: string,
  buyerId: string,
): Promise<ReviewEligibility | null> {
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('id')
    .eq('commission_id', commissionId)
    .eq('buyer_id', buyerId)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(1);
  if (orderError) throw new Error(orderError.message);

  const order = orders?.[0];
  if (!order) return null;

  const { data: existingReview, error: reviewError } = await supabase
    .from('commission_reviews')
    .select('id')
    .eq('order_id', order.id)
    .maybeSingle();
  if (reviewError) throw new Error(reviewError.message);

  return { orderId: order.id, alreadyReviewed: existingReview !== null };
}

/**
 * Submit a 1-5 star review (with optional text) for a completed order.
 * The server re-verifies eligibility, so this is safe to call directly.
 */
export async function submitCommissionReview(
  orderId: string,
  rating: number,
  text: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('submit_commission_review', {
    p_order_id: orderId,
    p_rating: rating,
    p_text: text.trim().length > 0 ? text.trim() : null,
  });
  return { error: error ? error.message : null };
}
