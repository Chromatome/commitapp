import { supabase } from './supabase';

/**
 * Data access for user profiles, badges, commissions, and reviews.
 * Backed by the Supabase schema:
 *   profiles(id, username, reputation [default 50], sales_count, about_me, ...)
 *   badges(slug, name, description, icon) / profile_badges(profile_id, badge_id)
 *   commissions(profile_id, title, price, payment_type, split_upfront_percent,
 *               time_taken, tags, times_sold, phases, artist_terms, ...)
 *   commission_reviews(commission_id, reviewer_name, reviewer_reputation, rating, text)
 */

export type Profile = {
  id: string;
  username: string;
  reputation: number;
  sales_count: number;
  about_me: string;
  avatar_url: string | null;
  created_at: string;
};

export type Badge = {
  slug: string;
  name: string;
  description: string;
  icon: string;
};

export type PaymentType = 'upfront' | 'installments' | 'split';

export type Commission = {
  id: string;
  profile_id: string;
  title: string;
  price: number;
  payment_type: PaymentType;
  split_upfront_percent: number | null;
  time_taken: string;
  tags: string[];
  times_sold: number;
  phases: string[];
  artist_terms: string;
  created_at: string;
};

export type CommissionReview = {
  id: string;
  commission_id: string;
  reviewer_name: string;
  reviewer_reputation: number | null;
  rating: number;
  text: string | null;
  created_at: string;
  /** Joined commission title for display. */
  commission_title: string;
};

/** Everything the profile page needs, fetched in parallel. */
export type ProfilePageData = {
  profile: Profile;
  badges: Badge[];
  commissions: Commission[];
  reviews: CommissionReview[];
};

export async function fetchProfilePageData(userId: string): Promise<ProfilePageData> {
  const [profileRes, badgesRes, commissionsRes, reviewsRes] = await Promise.all([
    supabase.from('profiles').select('id, username, reputation, sales_count, about_me, avatar_url, created_at').eq('id', userId).single(),
    supabase.from('profile_badges').select('badges(slug, name, description, icon)').eq('profile_id', userId),
    supabase
      .from('commissions')
      .select('*')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('commission_reviews')
      .select('*, commissions!inner(profile_id, title)')
      .eq('commissions.profile_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  if (profileRes.error) throw new Error(profileRes.error.message);
  if (badgesRes.error) throw new Error(badgesRes.error.message);
  if (commissionsRes.error) throw new Error(commissionsRes.error.message);
  if (reviewsRes.error) throw new Error(reviewsRes.error.message);

  const badges = (badgesRes.data ?? [])
    .map((row) => (row as unknown as { badges: Badge | null }).badges)
    .filter((b): b is Badge => b !== null);

  const commissions = (commissionsRes.data ?? []).map((c) => ({
    ...c,
    phases: Array.isArray(c.phases) ? (c.phases as string[]) : [],
    tags: Array.isArray(c.tags) ? (c.tags as string[]) : [],
  })) as Commission[];

  const reviews = (reviewsRes.data ?? []).map((r) => {
    const joined = r as unknown as { commissions: { title: string } | null };
    return {
      id: r.id,
      commission_id: r.commission_id,
      reviewer_name: r.reviewer_name,
      reviewer_reputation: r.reviewer_reputation,
      rating: r.rating,
      text: r.text,
      created_at: r.created_at,
      commission_title: joined.commissions?.title ?? 'Commission',
    } as CommissionReview;
  });

  return { profile: profileRes.data as Profile, badges, commissions, reviews };
}

export type NewCommissionInput = {
  title: string;
  price: number;
  payment_type: PaymentType;
  split_upfront_percent: number | null;
  time_taken: string;
  tags: string[];
  phases: string[];
  artist_terms: string;
};

/** Update the current user's own profile fields (username, about_me). */
export async function updateProfile(
  profileId: string,
  fields: Partial<Pick<Profile, 'username' | 'about_me'>>,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update(fields).eq('id', profileId);
  return { error: error ? error.message : null };
}

/**
 * Upload a new profile picture to the public `avatars` bucket
 * ({userId}/avatar.ext — RLS restricts writes to the owner's folder)
 * and save its public URL on the profile row.
 */
export async function uploadAvatar(
  profileId: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${profileId}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });
  if (uploadError) return { url: null, error: uploadError.message };

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = data.publicUrl;

  const { error: saveError } = await supabase
    .from('profiles')
    .update({ avatar_url: url })
    .eq('id', profileId);
  if (saveError) return { url: null, error: saveError.message };

  return { url, error: null };
}

/** Lightweight fetch of the current user's own profile (for navbar/sidebar avatars). */
export async function fetchOwnProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, reputation, sales_count, about_me, avatar_url, created_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Profile | null;
}

/** Create a commission listing owned by the given profile. Anyone can list one. */
export async function createCommission(
  profileId: string,
  input: NewCommissionInput,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('commissions').insert({
    profile_id: profileId,
    title: input.title.trim(),
    price: input.price,
    payment_type: input.payment_type,
    split_upfront_percent: input.payment_type === 'split' ? input.split_upfront_percent : null,
    time_taken: input.time_taken.trim(),
    tags: input.tags,
    phases: input.phases,
    artist_terms: input.artist_terms.trim(),
  });
  return { error: error ? error.message : null };
}
