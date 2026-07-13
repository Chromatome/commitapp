import { supabase } from './supabase';

// ============================================================
// Types matching the Supabase user profile schema
// ============================================================

export type AccountAgeTier =
  | 'brand_new' // < 30 days
  | 'new' // < 6 months
  | 'established' // < 1 year
  | 'veteran' // < 2 years
  | 'multiple_years'; // 2+ years

export type ActivityStatus =
  | 'online' // seen < 5 min ago
  | 'recently_active' // seen < 1 hour ago
  | 'active_this_week' // seen < 7 days ago
  | 'offline';

export interface Profile {
  id: string;
  username: string;
  reputation: number; // 0-100, defaults to 50, system-managed
  sales_count: number; // system-managed
  about_me: string;
  created_at: string;
  updated_at: string;
  last_seen_at: string;
  is_admin: boolean; // system-managed
}

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  created_at: string;
}

/** Badge as embedded in profile_overview.badges (jsonb array). */
export interface ProfileBadge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  granted_at: string;
}

export interface ProfileOverview {
  id: string;
  username: string;
  reputation: number;
  sales_count: number;
  about_me: string;
  created_at: string;
  account_age_tier: AccountAgeTier;
  /** True until the artist has 5+ commission sales. Display a "New Artist"
   * marker so a starting reputation of 50 is not mistaken for fraud. */
  is_new_artist: boolean;
  last_seen_at: string;
  activity_status: ActivityStatus;
  is_admin: boolean;
  follower_count: number;
  following_count: number;
  average_rating: number;
  review_count: number;
  commission_count: number;
  /** Admin-granted badges, oldest first. */
  badges: ProfileBadge[];
}

export type PaymentType = 'upfront' | 'installments' | 'split';

/** An artist-defined stage of development with its own price. */
export interface CommissionPhase {
  name: string;
  description: string;
  price: number; // credits
}

export interface Commission {
  id: string;
  profile_id: string;
  title: string;
  price: number; // total price in credits
  payment_type: PaymentType;
  /** For 'split' (%/%): percent paid upfront, remainder on completion. */
  split_upfront_percent: number | null;
  time_taken: string;
  tags: string[];
  times_sold: number; // system-managed
  phases: CommissionPhase[];
  artist_terms: string;
  created_at: string;
  updated_at: string;
}

/** Everything the /profile page needs, fetched in one request. */
export interface ProfilePageData {
  profile: ProfileOverview | null;
  social_links: SocialLink[];
  commissions: Commission[];
  reviews: ReviewWithReviewer[];
}

export interface SocialLink {
  id: string;
  profile_id: string;
  platform: string;
  url: string;
  created_at: string;
}

export interface Review {
  id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number; // 1-5
  body: string;
  created_at: string;
}

export interface ReviewWithReviewer extends Review {
  reviewer: Pick<Profile, 'id' | 'username' | 'reputation'> | null;
}

// ============================================================
// Profiles
// ============================================================

/** Fetch a profile with derived stats (followers, rating, account age tier). */
export async function getProfileOverview(profileId: string) {
  const { data, error } = await supabase
    .from('profile_overview')
    .select('*')
    .eq('id', profileId)
    .single();
  if (error) throw error;
  return data as ProfileOverview;
}

/** Fetch a profile overview by username (case-insensitive). */
export async function getProfileByUsername(username: string) {
  const { data, error } = await supabase
    .from('profile_overview')
    .select('*')
    .ilike('username', username)
    .maybeSingle();
  if (error) throw error;
  return data as ProfileOverview | null;
}

/** Update the current user's editable fields (username, about_me). */
export async function updateMyProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'username' | 'about_me'>>
) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

// ============================================================
// Follows
// ============================================================

/** IDs of accounts that follow the given profile. */
export async function getFollowerIds(profileId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', profileId);
  if (error) throw error;
  return (data ?? []).map((r) => r.follower_id as string);
}

/** Follower profiles (id + username) for display. */
export async function getFollowers(profileId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('follower:profiles!follows_follower_id_fkey(id, username, reputation)')
    .eq('following_id', profileId);
  if (error) throw error;
  return (data ?? []).map((r) => r.follower) as unknown as Pick<
    Profile,
    'id' | 'username' | 'reputation'
  >[];
}

export async function followUser(myId: string, targetId: string) {
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: myId, following_id: targetId });
  if (error) throw error;
}

export async function unfollowUser(myId: string, targetId: string) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', myId)
    .eq('following_id', targetId);
  if (error) throw error;
}

export async function isFollowing(myId: string, targetId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', myId)
    .eq('following_id', targetId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

// ============================================================
// Social links
// ============================================================

export async function getSocialLinks(profileId: string) {
  const { data, error } = await supabase
    .from('social_links')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SocialLink[];
}

export async function addSocialLink(profileId: string, platform: string, url: string) {
  const { data, error } = await supabase
    .from('social_links')
    .insert({ profile_id: profileId, platform, url })
    .select()
    .single();
  if (error) throw error;
  return data as SocialLink;
}

export async function removeSocialLink(linkId: string) {
  const { error } = await supabase.from('social_links').delete().eq('id', linkId);
  if (error) throw error;
}

// ============================================================
// Reviews
// ============================================================

/** Displayable reviews for a profile, newest first, with reviewer info. */
export async function getReviews(profileId: string) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles!reviews_reviewer_id_fkey(id, username, reputation)')
    .eq('reviewee_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ReviewWithReviewer[];
}

/** Leave (or replace) a review on another user's profile. */
export async function submitReview(
  reviewerId: string,
  revieweeId: string,
  rating: number,
  body: string
) {
  const { data, error } = await supabase
    .from('reviews')
    .upsert(
      { reviewer_id: reviewerId, reviewee_id: revieweeId, rating, body },
      { onConflict: 'reviewer_id,reviewee_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as Review;
}

export async function deleteReview(reviewId: string) {
  const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
  if (error) throw error;
}

// ============================================================
// Profile page (single-request fetch)
// ============================================================

/**
 * Fetch everything the profile page needs — profile overview, social links,
 * commissions, and reviews — in a single GET request via the
 * `get_profile_page` database function.
 */
export async function getProfilePage(profileId: string) {
  const { data, error } = await supabase.rpc('get_profile_page', { pid: profileId });
  if (error) throw error;
  const page = data as ProfilePageData;
  return {
    profile: page.profile ?? null,
    social_links: page.social_links ?? [],
    commissions: page.commissions ?? [],
    reviews: page.reviews ?? [],
  } as ProfilePageData;
}

// ============================================================
// Commissions
// ============================================================

/** All commissions listed by a profile, newest first. */
export async function getCommissions(profileId: string) {
  const { data, error } = await supabase
    .from('commissions')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Commission[];
}

export type CommissionInput = Omit<
  Commission,
  'id' | 'profile_id' | 'times_sold' | 'created_at' | 'updated_at'
>;

/** Create a commission listing on the current user's profile. */
export async function createCommission(profileId: string, input: CommissionInput) {
  const { data, error } = await supabase
    .from('commissions')
    .insert({ ...input, profile_id: profileId })
    .select()
    .single();
  if (error) throw error;
  return data as Commission;
}

/**
 * Update an owned commission. All fields are editable except `times_sold`,
 * which is system-managed and enforced by RLS.
 */
export async function updateCommission(commissionId: string, updates: Partial<CommissionInput>) {
  const { data, error } = await supabase
    .from('commissions')
    .update(updates)
    .eq('id', commissionId)
    .select()
    .single();
  if (error) throw error;
  return data as Commission;
}

export async function deleteCommission(commissionId: string) {
  const { error } = await supabase.from('commissions').delete().eq('id', commissionId);
  if (error) throw error;
}

// ============================================================
// Presence (activity status)
// ============================================================

/**
 * Report that the signed-in user is active. Call on app load and on an
 * interval (e.g. every 2 minutes) while the tab is visible.
 */
export async function sendHeartbeat() {
  const { error } = await supabase.rpc('heartbeat');
  if (error) throw error;
}

/**
 * Start reporting presence on an interval. Returns a cleanup function.
 * Pauses while the tab is hidden.
 */
export function startPresenceHeartbeat(intervalMs = 120_000) {
  const beat = () => {
    if (document.visibilityState === 'visible') {
      sendHeartbeat().catch(() => {
        // Non-fatal: presence is best-effort
      });
    }
  };
  beat();
  const id = setInterval(beat, intervalMs);
  document.addEventListener('visibilitychange', beat);
  return () => {
    clearInterval(id);
    document.removeEventListener('visibilitychange', beat);
  };
}

// ============================================================
// Badges (admin-granted)
// ============================================================

/** Full badge catalog (publicly readable). */
export async function getBadgeCatalog() {
  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Badge[];
}

/** Badges granted to a profile (also available on profile_overview.badges). */
export async function getProfileBadges(profileId: string) {
  const { data, error } = await supabase
    .from('profile_badges')
    .select('granted_at, badge:badges(*)')
    .eq('profile_id', profileId)
    .order('granted_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...(r.badge as unknown as Badge),
    granted_at: r.granted_at as string,
  })) as ProfileBadge[];
}

/** Grant a badge to a profile. RLS restricts this to admins. */
export async function grantBadge(profileId: string, badgeId: string, grantedBy: string) {
  const { error } = await supabase
    .from('profile_badges')
    .insert({ profile_id: profileId, badge_id: badgeId, granted_by: grantedBy });
  if (error) throw error;
}

/** Revoke a badge from a profile. RLS restricts this to admins. */
export async function revokeBadge(profileId: string, badgeId: string) {
  const { error } = await supabase
    .from('profile_badges')
    .delete()
    .eq('profile_id', profileId)
    .eq('badge_id', badgeId);
  if (error) throw error;
}

// ============================================================
// Helpers
// ============================================================

export const ACCOUNT_AGE_LABELS: Record<AccountAgeTier, string> = {
  brand_new: 'Brand New',
  new: 'New',
  established: 'Established',
  veteran: 'Veteran',
  multiple_years: 'Multiple Years',
};

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  online: 'Online',
  recently_active: 'Recently Active',
  active_this_week: 'Active This Week',
  offline: 'Offline',
};

/** Label for the marker shown until an artist reaches 5+ commission sales. */
export const NEW_ARTIST_LABEL = 'New Artist';

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  upfront: 'Upfront',
  installments: 'Installments',
  split: 'Split %/%',
};
