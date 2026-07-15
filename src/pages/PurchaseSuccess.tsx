import React from 'react';
import { useSearchParams } from 'react-router';
import useSWR from 'swr';
import '../styles/styles.css';
import '../styles/purchasesuccess.css';
import Navbar from '../components/Navbar';
import Background from '../components/Background';
import LinkButton from '../components/LinkButton';
import { fetchOrder, type OrderWithProfiles } from '../lib/orders';

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  upfront: 'All Upfront',
  installments: 'Installments Per Phase',
  split: 'Split (Upfront + Remainder)',
};

const PurchaseSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order');

  const { data: order, isLoading } = useSWR<OrderWithProfiles | null>(
    orderId ? ['order', orderId] : null,
    () => fetchOrder(orderId as string),
  );

  const isPhased = order ? order.payment_type !== 'upfront' : false;
  const totalCharged = order ? order.paid_credits + order.total_fee : 0;
  const remaining = order ? order.total_price - order.paid_credits : 0;

  return (
    <div className="ps-page">
      <Background
        direction="diagonal"
        speed={0.3}
        borderColor="rgba(0, 0, 0, 0.05)"
      />

      <Navbar />

      <main className="ps-body">
        <div className="ps-card">
          <div className="ps-check" aria-hidden="true">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>

          <h1 className="ps-title">Purchase Successful!</h1>
          <p className="ps-subtitle">
            {isPhased
              ? 'Your commission has been ordered and the first payment is in. The artist will request the next payment in your messages along with a progress snapshot.'
              : 'Your commission has been ordered and paid in full. The artist will be notified and work will begin shortly.'}
          </p>

          {isLoading && <p className="ps-subtitle">Loading your order…</p>}

          {!isLoading && !order && (
            <p className="ps-subtitle" role="alert">
              We couldn&apos;t find this order. It may belong to another account.
            </p>
          )}

          {order && (
            <section className="ps-summary" aria-label="Order summary">
              <h2 className="ps-summary-title">Order Summary</h2>
              <dl className="ps-summary-grid">
                <div className="ps-summary-item">
                  <dt>Order ID</dt>
                  <dd>{order.id.slice(0, 8).toUpperCase()}</dd>
                </div>
                <div className="ps-summary-item">
                  <dt>Commission</dt>
                  <dd>{order.title}</dd>
                </div>
                <div className="ps-summary-item">
                  <dt>Artist</dt>
                  <dd>{order.artist?.username ?? 'Unknown artist'}</dd>
                </div>
                <div className="ps-summary-item">
                  <dt>Payment Type</dt>
                  <dd>{PAYMENT_TYPE_LABELS[order.payment_type] ?? order.payment_type}</dd>
                </div>
                <div className="ps-summary-item">
                  <dt>Commission Price</dt>
                  <dd>{order.total_price.toLocaleString()} Credits</dd>
                </div>
                {isPhased && (
                  <>
                    <div className="ps-summary-item">
                      <dt>Paid Now{order.payment_type === 'installments' ? ` (Phase 1 of ${order.phase_count})` : ' (Upfront)'}</dt>
                      <dd>{order.paid_credits.toLocaleString()} Credits</dd>
                    </div>
                    <div className="ps-summary-item">
                      <dt>Remaining (paid per phase)</dt>
                      <dd>{remaining.toLocaleString()} Credits</dd>
                    </div>
                  </>
                )}
                <div className="ps-summary-item">
                  <dt>Credit Fee (10%, min 1)</dt>
                  <dd>{order.total_fee.toLocaleString()} Credits</dd>
                </div>
                <div className="ps-summary-item ps-summary-total">
                  <dt>Total Charged</dt>
                  <dd>{totalCharged.toLocaleString()} Credits</dd>
                </div>
              </dl>
            </section>
          )}

          <div className="ps-actions">
            <LinkButton
              label="Message the Artist"
              href={order?.artist ? `/messages?with=${order.artist.id}` : '/messages'}
              isPrimary
              color="var(--pink)"
            />
            <LinkButton label="Back to Marketplace" href="/marketplace" color="var(--gray-bg)" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default PurchaseSuccess;
