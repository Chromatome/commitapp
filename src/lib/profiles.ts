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

export interface Profile {
  id: string;
  username: string;
  reputation: number; // 0-100, system-managed
  sales_count: number; // system-managed
  about_me: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileOverview {
  id: string;
  username: string;
  reputation: number;
  sales_count: number;
  about_me: string;
  created_at: string;
  account_age_tier: AccountAgeTier;
  follower_count: number;
  following_count: number;
  average_rating: number;
  review_count: number;
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
// Helpers
// ============================================================

export const ACCOUNT_AGE_LABELS: Record<AccountAgeTier, string> = {
  brand_new: 'Brand New',
  new: 'New',
  established: 'Established',
  veteran: 'Veteran',
  multiple_years: 'Multiple Years',
};
