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
  thumbnail_url: string | null;
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

/** A commission listing joined with its artist's public profile, for marketplace browsing. */
export type MarketplaceListing = {
  id: string;
  title: string;
  price: number;
  tags: string[];
  created_at: string;
  artist_name: string;
  artist_reputation: number;
  thumbnail_url: string | null;
};

/** Fetch all commission listings (newest first) with artist name + reputation for the marketplace. */
export async function fetchMarketplaceListings(): Promise<MarketplaceListing[]> {
  const { data, error } = await supabase
    .from('commissions')
    .select('id, title, price, tags, created_at, thumbnail_url, profiles(username, reputation)')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const joined = row as unknown as {
      id: string;
      title: string;
      price: number;
      tags: unknown;
      created_at: string;
      thumbnail_url: string | null;
      profiles: { username: string; reputation: number } | null;
    };
    return {
      id: joined.id,
      title: joined.title,
      price: Number(joined.price),
      tags: Array.isArray(joined.tags) ? (joined.tags as string[]) : [],
      created_at: joined.created_at,
      artist_name: joined.profiles?.username ?? 'Unknown Artist',
      artist_reputation: joined.profiles?.reputation ?? 50,
      thumbnail_url: joined.thumbnail_url ?? null,
    };
  });
}

/** A single commission with its artist's profile and reviews, for the commission info page. */
export type CommissionInfoData = {
  commission: Commission;
  artist: Pick<Profile, 'id' | 'username' | 'reputation' | 'avatar_url' | 'about_me'>;
  reviews: CommissionReview[];
};

/** Fetch one commission by id with its artist profile and reviews. Returns null when not found. */
export async function fetchCommissionInfo(commissionId: string): Promise<CommissionInfoData | null> {
  const { data, error } = await supabase
    .from('commissions')
    .select('*, profiles(id, username, reputation, avatar_url, about_me)')
    .eq('id', commissionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const joined = data as unknown as typeof data & {
    profiles: Pick<Profile, 'id' | 'username' | 'reputation' | 'avatar_url' | 'about_me'> | null;
  };
  if (!joined.profiles) return null;

  const { data: reviewRows, error: reviewsError } = await supabase
    .from('commission_reviews')
    .select('*')
    .eq('commission_id', commissionId)
    .order('created_at', { ascending: false });
  if (reviewsError) throw new Error(reviewsError.message);

  const commission = {
    ...data,
    phases: Array.isArray(data.phases) ? (data.phases as string[]) : [],
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
  } as Commission;

  const reviews = (reviewRows ?? []).map((r) => ({
    ...r,
    commission_title: commission.title,
  })) as CommissionReview[];

  return { commission, artist: joined.profiles, reviews };
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
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('commissions')
    .insert({
      profile_id: profileId,
      title: input.title.trim(),
      price: input.price,
      payment_type: input.payment_type,
      split_upfront_percent: input.payment_type === 'split' ? input.split_upfront_percent : null,
      time_taken: input.time_taken.trim(),
      tags: input.tags,
      phases: input.phases,
      artist_terms: input.artist_terms.trim(),
    })
    .select('id')
    .single();
  return { id: data?.id ?? null, error: error ? error.message : null };
}

/**
 * Upload a thumbnail image for a commission listing to the public
 * `commission-thumbnails` bucket ({profileId}/{commissionId}.ext — RLS
 * restricts writes to the owner's folder, same pattern as avatars) and save
 * its public URL on the commission row.
 */
export async function uploadCommissionThumbnail(
  commissionId: string,
  profileId: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${profileId}/${commissionId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('commission-thumbnails')
    .upload(path, file, { cacheControl: '3600', upsert: true });
  if (uploadError) return { url: null, error: uploadError.message };

  const { data } = supabase.storage.from('commission-thumbnails').getPublicUrl(path);
  const url = data.publicUrl;

  const { error: saveError } = await supabase
    .from('commissions')
    .update({ thumbnail_url: url })
    .eq('id', commissionId);
  if (saveError) return { url: null, error: saveError.message };

  return { url, error: null };
}
