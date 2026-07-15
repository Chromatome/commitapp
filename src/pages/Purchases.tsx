import React from 'react';
import { Link } from 'react-router';
import useSWR from 'swr';
import '../styles/styles.css';
import '../styles/dashboard.css';
import Navbar from '../components/Navbar';
import Background from '../components/Background';
import { useSession } from '../hooks/useSession';
import { fetchBuyerOrders, type BuyerOrder } from '../lib/orders';

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  upfront: 'All Upfront',
  installments: 'Per Phase',
  split: 'Split',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

const PurchaseCard: React.FC<{ order: BuyerOrder }> = ({ order }) => {
  const paidPct = Math.min(100, Math.round((order.paid_credits / order.total_price) * 100));
  const currentPhase = Math.min(order.phases_paid, order.phase_count);
  const phaseLabel =
    order.payment_type === 'installments'
      ? `Phase ${currentPhase} of ${order.phase_count}${order.phases[currentPhase - 1] ? ` — ${order.phases[currentPhase - 1]}` : ''}`
      : PAYMENT_TYPE_LABELS[order.payment_type] ?? order.payment_type;

  // Fully paid off and nothing left to review it against — this is the
  // whole point of the page, so it gets top billing on the card.
  const needsReview = order.status === 'completed' && !order.reviewed && order.commission_id !== null;

  return (
    <article className="db-card">
      <div className="db-card-snapshot">
        {order.latest_snapshot_url ? (
          <img
            src={order.latest_snapshot_url || '/placeholder.svg'}
            alt={`Latest progress snapshot for ${order.title}`}
            loading="lazy"
          />
        ) : (
          <div className="db-card-nosnapshot">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span>No snapshot yet</span>
          </div>
        )}
      </div>

      <div className="db-card-body">
        <header className="db-card-top">
          <h2 className="db-card-title">{order.title}</h2>
          <span className={`db-status db-status-${order.status}`}>
            {order.status === 'in_progress' ? 'In Progress' : order.status === 'completed' ? 'Completed' : 'Cancelled'}
          </span>
        </header>

        <p className="db-card-buyer">
          From <strong>{order.artist?.username ?? 'Unknown artist'}</strong> · ordered {formatDate(order.created_at)}
        </p>

        <p className="db-card-phase">{phaseLabel}</p>

        <div className="db-progress" role="img" aria-label={`${paidPct}% of ${order.total_price} credits paid`}>
          <div className="db-progress-fill" style={{ width: `${paidPct}%` }} />
        </div>
        <p className="db-card-paid">
          {order.paid_credits.toLocaleString()} / {order.total_price.toLocaleString()} credits paid ({paidPct}%)
        </p>

        <div className="db-card-actions">
          {needsReview && (
            <Link className="db-review-cta" to={`/commission?id=${order.commission_id}`}>
              ★ Leave a review
            </Link>
          )}
          {order.status === 'completed' && order.reviewed && (
            <span className="db-reviewed-tag">✓ Reviewed</span>
          )}
          {order.artist && (
            <Link className="db-dm-link" to={`/messages?with=${order.artist.id}`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              Message {order.artist.username}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
};

const Purchases: React.FC = () => {
  const { session, checking } = useSession();
  const viewerId = session?.user?.id ?? null;

  const { data: orders, isLoading } = useSWR<BuyerOrder[]>(
    viewerId ? ['buyer-orders', viewerId] : null,
    () => fetchBuyerOrders(viewerId as string),
  );

  const all = orders ?? [];
  const needsReview = all.filter(
    (o) => o.status === 'completed' && !o.reviewed && o.commission_id !== null,
  );
  const inProgress = all.filter((o) => o.status === 'in_progress');
  const rest = all.filter((o) => !needsReview.includes(o) && o.status !== 'in_progress');

  if (checking) {
    return (
      <div className="db-page">
        <Navbar />
        <p className="db-status-msg">Loading…</p>
      </div>
    );
  }

  return (
    <div className="db-page">
      <Background direction="diagonal" speed={0.3} borderColor="rgba(0, 0, 0, 0.05)" />
      <Navbar />

      <main className="db-body">
        <header className="db-header">
          <h1 className="db-title">My Purchases</h1>
          <p className="db-subtitle">
            Commissions you've bought, their progress, and anything you can review.
          </p>
        </header>

        {isLoading ? (
          <p className="db-status-msg">Loading your purchases…</p>
        ) : all.length === 0 ? (
          <div className="db-empty">
            <p>No purchases yet.</p>
            <p className="db-empty-hint">
              When you buy a commission, it'll show up here — and once it's fully paid
              off, you'll be able to leave a review right from this page.
            </p>
            <Link className="db-dm-link" to="/marketplace">
              Browse the marketplace
            </Link>
          </div>
        ) : (
          <>
            {needsReview.length > 0 && (
              <section aria-label="Commissions ready to review">
                <h2 className="db-section-title">
                  Ready to Review <span className="db-count">{needsReview.length}</span>
                </h2>
                <div className="db-grid">
                  {needsReview.map((o) => (
                    <PurchaseCard order={o} key={o.id} />
                  ))}
                </div>
              </section>
            )}

            <section aria-label="In-progress purchases">
              <h2 className="db-section-title">
                In Progress <span className="db-count">{inProgress.length}</span>
              </h2>
              {inProgress.length === 0 ? (
                <p className="db-status-msg">Nothing in progress right now.</p>
              ) : (
                <div className="db-grid">
                  {inProgress.map((o) => (
                    <PurchaseCard order={o} key={o.id} />
                  ))}
                </div>
              )}
            </section>

            {rest.length > 0 && (
              <section aria-label="Past purchases">
                <h2 className="db-section-title">
                  Past Purchases <span className="db-count">{rest.length}</span>
                </h2>
                <div className="db-grid">
                  {rest.map((o) => (
                    <PurchaseCard order={o} key={o.id} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Purchases;
