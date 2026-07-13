import React from 'react';
import '../styles/styles.css';
import '../styles/purchasesuccess.css';
import Navbar from '../components/Navbar';
import Background from '../components/Background';
import LinkButton from '../components/LinkButton';

// Placeholder order data — this will come from the real purchase flow
// once payment processing is wired up.
const ORDER = {
  commissionTitle: 'Comm Title',
  artist: 'Artist Name',
  priceCredits: '1,000.00',
  totalUsdAfterFee: '$1,010.70',
  paymentType: 'Installments Per Phase (Even)',
  estimatedTime: '~1 month',
  orderId: 'CMT-000001',
};

const PurchaseSuccess: React.FC = () => {
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
            Your commission has been ordered. The artist will be notified and
            work will begin shortly — you can track progress from your orders.
          </p>

          <section className="ps-summary" aria-label="Order summary">
            <h2 className="ps-summary-title">Order Summary</h2>
            <dl className="ps-summary-grid">
              <div className="ps-summary-item">
                <dt>Order ID</dt>
                <dd>{ORDER.orderId}</dd>
              </div>
              <div className="ps-summary-item">
                <dt>Commission</dt>
                <dd>{ORDER.commissionTitle}</dd>
              </div>
              <div className="ps-summary-item">
                <dt>Artist</dt>
                <dd>{ORDER.artist}</dd>
              </div>
              <div className="ps-summary-item">
                <dt>Payment Type</dt>
                <dd>{ORDER.paymentType}</dd>
              </div>
              <div className="ps-summary-item">
                <dt>Estimated Time</dt>
                <dd>{ORDER.estimatedTime}</dd>
              </div>
              <div className="ps-summary-item">
                <dt>Credits</dt>
                <dd>{ORDER.priceCredits}</dd>
              </div>
              <div className="ps-summary-item ps-summary-total">
                <dt>Total (USD, after fee)</dt>
                <dd>{ORDER.totalUsdAfterFee}</dd>
              </div>
            </dl>
          </section>

          <div className="ps-actions">
            <LinkButton label="Back to Marketplace" href="/marketplace" isPrimary color="var(--pink)" />
            <LinkButton label="View Commission" href="/commission" color="var(--gray-bg)" />
          </div>
        </div>
      </main>
    </div>
  );
};

export default PurchaseSuccess;
