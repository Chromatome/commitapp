import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import useSWR from 'swr';
import '../styles/styles.css';
import '../styles/adminreports.css';
import Navbar from '../components/Navbar';
import Background from '../components/Background';
import Button from '../components/Button';
import { useSession } from '../hooks/useSession';
import {
  fetchAllReports,
  fetchIsAdmin,
  updateReport,
  adminDeleteCommission,
  adminDeleteAccount,
  REPORT_STATUS_LABELS,
  type ReportStatus,
  type ReportWithProfiles,
} from '../lib/reports';

const STATUS_FILTERS: Array<{ value: ReportStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

/** One expandable ticket row in the admin dashboard. */
const TicketCard: React.FC<{
  report: ReportWithProfiles;
  adminId: string;
  onUpdated: () => void;
}> = ({ report, adminId, onUpdated }) => {
  const [expanded, setExpanded] = useState(false);
  const [notesDraft, setNotesDraft] = useState(report.admin_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<'commission' | 'account' | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const applyUpdate = async (updates: { status?: ReportStatus; admin_notes?: string }) => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    const { error } = await updateReport(report.id, adminId, updates);
    setSaving(false);
    if (error) {
      setSaveError(error);
      return;
    }
    onUpdated();
  };

  const handleDeleteCommission = async () => {
    if (deleting || !report.commission) return;
    if (
      !window.confirm(
        `Permanently delete the commission "${report.commission.title}"? This can't be undone.`,
      )
    ) {
      return;
    }
    setDeleting('commission');
    setDeleteError(null);
    const { error } = await adminDeleteCommission(report.commission.id);
    setDeleting(null);
    if (error) {
      setDeleteError(error);
      return;
    }
    onUpdated();
  };

  const handleDeleteAccount = async () => {
    if (deleting || !report.reported) return;
    if (
      !window.confirm(
        `Permanently delete @${report.reported.username}'s account? This can't be undone.`,
      )
    ) {
      return;
    }
    setDeleting('account');
    setDeleteError(null);
    const { error } = await adminDeleteAccount(report.reported.id);
    setDeleting(null);
    if (error) {
      setDeleteError(error);
      return;
    }
    onUpdated();
  };

  return (
    <article className={`ar-ticket ar-status-${report.status}`}>
      <button
        type="button"
        className="ar-ticket-summary"
        aria-expanded={expanded}
        onClick={() => setExpanded((e) => !e)}
      >
        <span className={`ar-badge ar-badge-${report.status}`}>
          {REPORT_STATUS_LABELS[report.status]}
        </span>
        <span className={`ar-type ar-type-${report.target_type}`}>
          {report.target_type === 'commission' ? 'Commission' : 'Artist'}
        </span>
        <span className="ar-ticket-title">
          {report.reason_category}
          {' — '}
          {report.target_type === 'commission'
            ? report.commission?.title ?? 'Deleted commission'
            : report.reported?.username ?? 'Unknown artist'}
        </span>
        <span className="ar-ticket-date">{formatDate(report.created_at)}</span>
        <span className="ar-caret" aria-hidden="true">
          {expanded ? '\u25B4' : '\u25BE'}
        </span>
      </button>

      {expanded && (
        <div className="ar-ticket-detail">
          <dl className="ar-detail-grid">
            <div className="ar-detail-item">
              <dt>Reported by</dt>
              <dd>
                {report.reporter ? (
                  <a href={`/profile?id=${report.reporter.id}`}>{report.reporter.username}</a>
                ) : (
                  'Unknown'
                )}
              </dd>
            </div>
            <div className="ar-detail-item">
              <dt>Reported {report.target_type === 'commission' ? 'seller' : 'artist'}</dt>
              <dd>
                {report.reported ? (
                  <a href={`/profile?id=${report.reported.id}`}>{report.reported.username}</a>
                ) : (
                  'Unknown'
                )}
              </dd>
            </div>
            {report.target_type === 'commission' && (
              <div className="ar-detail-item">
                <dt>Commission</dt>
                <dd>
                  {report.commission ? (
                    <a href={`/commission?id=${report.commission.id}`}>
                      {report.commission.title}
                    </a>
                  ) : (
                    'Deleted commission'
                  )}
                </dd>
              </div>
            )}
            <div className="ar-detail-item ar-detail-wide">
              <dt>Description</dt>
              <dd className="ar-description">{report.description}</dd>
            </div>
          </dl>

          <div className="ar-proof">
            <h3 className="ar-section-title">Proof ({report.proof_urls.length})</h3>
            <div className="ar-proof-grid">
              {report.proof_urls.map((url, i) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ar-proof-thumb"
                >
                  <img src={url || "/placeholder.svg"} alt={`Proof ${i + 1}`} />
                </a>
              ))}
            </div>
          </div>

          <div className="ar-actions">
            <h3 className="ar-section-title">Moderation</h3>
            <label className="sr-only" htmlFor={`ar-notes-${report.id}`}>
              Admin notes
            </label>
            <textarea
              id={`ar-notes-${report.id}`}
              className="ar-notes"
              rows={3}
              placeholder="Internal notes (visible to admins only)..."
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
            />
            <div className="ar-action-buttons">
              {report.status !== 'under_review' && (
                <Button
                  label="Mark Under Review"
                  color="var(--yellow)"
                  disabled={saving}
                  onClick={() => applyUpdate({ status: 'under_review', admin_notes: notesDraft })}
                />
              )}
              {report.status !== 'resolved' && (
                <Button
                  label="Resolve"
                  color="var(--green)"
                  disabled={saving}
                  onClick={() => applyUpdate({ status: 'resolved', admin_notes: notesDraft })}
                />
              )}
              {report.status !== 'dismissed' && (
                <Button
                  label="Dismiss"
                  color="var(--gray-bg)"
                  disabled={saving}
                  onClick={() => applyUpdate({ status: 'dismissed', admin_notes: notesDraft })}
                />
              )}
              <Button
                label={saving ? 'Saving…' : 'Save Notes'}
                color="var(--blue)"
                disabled={saving}
                onClick={() => applyUpdate({ admin_notes: notesDraft })}
              />
            </div>
            {saveError && (
              <p className="ar-error" role="alert">
                {saveError}
              </p>
            )}
          </div>

          <div className="ar-actions ar-danger-zone">
            <h3 className="ar-section-title">Danger Zone</h3>
            <div className="ar-action-buttons">
              {report.target_type === 'commission' && report.commission && (
                <Button
                  label={deleting === 'commission' ? 'Deleting…' : 'Delete Commission'}
                  color="var(--red)"
                  disabled={deleting !== null}
                  onClick={handleDeleteCommission}
                />
              )}
              {report.reported && (
                <Button
                  label={deleting === 'account' ? 'Deleting…' : 'Delete Account'}
                  color="var(--red)"
                  disabled={deleting !== null}
                  onClick={handleDeleteAccount}
                />
              )}
            </div>
            {deleteError && (
              <p className="ar-error" role="alert">
                {deleteError}
              </p>
            )}
          </div>
        </div>
      )}
    </article>
  );
};

const AdminReports: React.FC = () => {
  const { session, checking } = useSession();
  const viewerId = session?.user?.id ?? null;
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all');

  const { data: isAdmin, isLoading: checkingAdmin } = useSWR(
    viewerId ? ['is-admin', viewerId] : null,
    () => fetchIsAdmin(viewerId as string),
  );

  const { data: reports, isLoading, error, mutate } = useSWR(
    viewerId && isAdmin ? ['admin-reports', statusFilter] : null,
    () => fetchAllReports(statusFilter === 'all' ? undefined : statusFilter),
  );

  if (checking || (viewerId && checkingAdmin)) {
    return (
      <div className="admin-page">
        <Background direction="diagonal" speed={0.3} borderColor="rgba(0, 0, 0, 0.05)" />
        <Navbar />
        <div className="ar-body">
          <p className="ar-status-msg">Checking access…</p>
        </div>
      </div>
    );
  }

  if (!viewerId || isAdmin === false) {
    return (
      <div className="admin-page">
        <Background direction="diagonal" speed={0.3} borderColor="rgba(0, 0, 0, 0.05)" />
        <Navbar />
        <div className="ar-body">
          <section className="ar-denied">
            <h1>Admins only</h1>
            <p>You need the admin badge to view the moderation dashboard.</p>
            <Button
              label="Back to Marketplace"
              color="var(--pink)"
              onClick={() => navigate('/marketplace')}
            />
          </section>
        </div>
      </div>
    );
  }

  const counts = {
    open: reports?.filter((r) => r.status === 'open').length ?? 0,
    under_review: reports?.filter((r) => r.status === 'under_review').length ?? 0,
  };

  return (
    <div className="admin-page">
      <Background direction="diagonal" speed={0.3} borderColor="rgba(0, 0, 0, 0.05)" />
      <Navbar />

      <main className="ar-body">
        <header className="ar-header">
          <h1 className="ar-title">Report Tickets</h1>
          {statusFilter === 'all' && reports && (
            <p className="ar-subtitle">
              {counts.open} open, {counts.under_review} under review
            </p>
          )}
        </header>

        <div className="ar-filters" role="tablist" aria-label="Filter by status">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={statusFilter === f.value}
              className={`ar-filter${statusFilter === f.value ? ' active' : ''}`}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="ar-list">
          {isLoading && <p className="ar-status-msg">Loading tickets…</p>}
          {error && (
            <p className="ar-status-msg" role="alert">
              Could not load tickets. Try refreshing.
            </p>
          )}
          {reports && reports.length === 0 && (
            <p className="ar-status-msg">No tickets in this category.</p>
          )}
          {reports?.map((report) => (
            <TicketCard
              key={report.id}
              report={report}
              adminId={viewerId}
              onUpdated={() => mutate()}
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminReports;
