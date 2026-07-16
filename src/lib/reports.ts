import { supabase } from './supabase';

/**
 * Data access for the reporting system.
 * Backed by:
 *   reports — tickets filed against a commission or an artist
 *   commission_report_flags — public view exposing only open-report counts
 *   report-proofs — public storage bucket for proof screenshots
 * RLS: reporters see their own tickets; admins (admin badge or
 * profiles.is_admin) see and update everything.
 */

export type ReportTargetType = 'commission' | 'artist';

export type ReportStatus = 'open' | 'under_review' | 'resolved' | 'dismissed';

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  open: 'Open',
  under_review: 'Under Review',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

export const COMMISSION_REPORT_REASONS = [
  'Scam or fraud',
  'AI-generated art',
  'Stolen or traced artwork',
  'Misleading listing',
  'Inappropriate content',
  'Other',
] as const;

export const ARTIST_REPORT_REASONS = [
  'Scam or fraud',
  'Posting AI-generated art',
  'Art theft or tracing',
  'Harassment or abuse',
  'Impersonation',
  'Failure to deliver commissions',
  'Other',
] as const;

export type Report = {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  commission_id: string | null;
  reported_profile_id: string;
  reason_category: string;
  description: string;
  proof_urls: string[];
  status: ReportStatus;
  admin_notes: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ReportWithProfiles = Report & {
  reporter: { id: string; username: string; avatar_url: string | null } | null;
  reported: { id: string; username: string; avatar_url: string | null } | null;
  commission: { id: string; title: string } | null;
};

/** Upload one proof screenshot to report-proofs/{userId}/... and return its public URL. */
async function uploadProofFile(
  userId: string,
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('report-proofs')
    .upload(path, file, { cacheControl: '3600' });
  if (uploadError) return { url: null, error: uploadError.message };

  const { data } = supabase.storage.from('report-proofs').getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

/**
 * File a report ticket. Uploads all proof images first (at least one is
 * required — also enforced by a DB check constraint), then inserts the row.
 */
export async function submitReport(params: {
  reporterId: string;
  targetType: ReportTargetType;
  commissionId?: string | null;
  reportedProfileId: string;
  reasonCategory: string;
  description: string;
  proofFiles: File[];
}): Promise<{ reportId: string | null; error: string | null }> {
  if (params.proofFiles.length === 0) {
    return { reportId: null, error: 'At least one proof image is required.' };
  }

  const proofUrls: string[] = [];
  for (const file of params.proofFiles) {
    const { url, error } = await uploadProofFile(params.reporterId, file);
    if (error || !url) return { reportId: null, error: error ?? 'Upload failed.' };
    proofUrls.push(url);
  }

  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: params.reporterId,
      target_type: params.targetType,
      commission_id: params.commissionId ?? null,
      reported_profile_id: params.reportedProfileId,
      reason_category: params.reasonCategory,
      description: params.description,
      proof_urls: proofUrls,
    })
    .select('id')
    .single();

  if (error) return { reportId: null, error: error.message };
  return { reportId: data.id as string, error: null };
}

/** Open-report count for a commission (public view; visible to everyone). */
export async function fetchCommissionReportFlag(commissionId: string): Promise<number> {
  const { data, error } = await supabase
    .from('commission_report_flags')
    .select('open_report_count')
    .eq('commission_id', commissionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.open_report_count ?? 0;
}

/**
 * Whether the viewer already has an active (open/under review) report against
 * this target — used to disable the report button after filing.
 */
export async function hasActiveReport(
  reporterId: string,
  target: { commissionId?: string | null; reportedProfileId?: string },
): Promise<boolean> {
  let query = supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('reporter_id', reporterId)
    .in('status', ['open', 'under_review']);

  if (target.commissionId) {
    query = query.eq('commission_id', target.commissionId);
  } else if (target.reportedProfileId) {
    query = query.eq('reported_profile_id', target.reportedProfileId).eq('target_type', 'artist');
  }

  const { count, error } = await query;
  if (error) return false;
  return (count ?? 0) > 0;
}

/** Whether the current viewer is an admin (admin badge or profiles.is_admin). */
export async function fetchIsAdmin(userId: string): Promise<boolean> {
  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle(),
    supabase
      .from('profile_badges')
      .select('badge_id, badges!inner(slug)', { count: 'exact', head: true })
      .eq('profile_id', userId)
      .eq('badges.slug', 'admin'),
  ]);
  return Boolean(profile?.is_admin) || (count ?? 0) > 0;
}

/** All report tickets (admin only via RLS), newest first, optionally filtered by status. */
export async function fetchAllReports(status?: ReportStatus): Promise<ReportWithProfiles[]> {
  let query = supabase
    .from('reports')
    .select(
      '*, reporter:profiles!reports_reporter_id_fkey(id, username, avatar_url), reported:profiles!reports_reported_profile_id_fkey(id, username, avatar_url), commission:commissions(id, title)',
    )
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ReportWithProfiles[];
}

/** Admin: update a ticket's status and/or internal notes. */
export async function updateReport(
  reportId: string,
  adminId: string,
  updates: { status?: ReportStatus; admin_notes?: string },
): Promise<{ error: string | null }> {
  const payload: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };
  if (updates.status === 'resolved' || updates.status === 'dismissed') {
    payload.resolved_by = adminId;
  }
  const { error } = await supabase.from('reports').update(payload).eq('id', reportId);
  return { error: error ? error.message : null };
}

/**
 * Admin: permanently delete the reported commission listing.
 * Backed by the `admin_delete_commission` RPC (security definer, admin-only).
 * The ticket itself is unaffected — commission_id is set null and the
 * dashboard falls back to showing "Deleted commission".
 */
export async function adminDeleteCommission(commissionId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_delete_commission', {
    p_commission_id: commissionId,
  });
  return { error: error ? error.message : null };
}

/**
 * Admin: permanently delete a profile (backed by the `admin_delete_account`
 * RPC, security definer, admin-only). Note this removes the public.profiles
 * row and anything that cascades from it, but not the underlying auth.users
 * login — see the comment on the RPC for why. Because reports.reported_profile_id
 * cascades on delete, any tickets against this account (including this one)
 * disappear once it's gone.
 */
export async function adminDeleteAccount(profileId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_delete_account', {
    p_profile_id: profileId,
  });
  return { error: error ? error.message : null };
}
