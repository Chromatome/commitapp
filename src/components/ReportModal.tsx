import React, { useMemo, useRef, useState } from 'react';
import '../styles/reportmodal.css';
import Button from './Button';
import {
  ARTIST_REPORT_REASONS,
  COMMISSION_REPORT_REASONS,
  submitReport,
  type ReportTargetType,
} from '../lib/reports';

const MIN_DESCRIPTION_LENGTH = 20;
const MAX_PROOF_FILES = 5;

type Step = 'reason' | 'details' | 'proof' | 'review' | 'done';

const STEP_ORDER: Step[] = ['reason', 'details', 'proof', 'review'];

const STEP_TITLES: Record<Step, string> = {
  reason: 'What went wrong?',
  details: 'Tell us more',
  proof: 'Add proof',
  review: 'Review your ticket',
  done: 'Ticket submitted',
};

interface ReportModalProps {
  targetType: ReportTargetType;
  /** Commission id when reporting a commission. */
  commissionId?: string | null;
  /** Profile being reported (commission owner, or the artist directly). */
  reportedProfileId: string;
  /** Human-readable label of what's being reported (commission title / artist username). */
  targetLabel: string;
  reporterId: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({
  targetType,
  commissionId,
  reportedProfileId,
  targetLabel,
  reporterId,
  onClose,
  onSubmitted,
}) => {
  const [step, setStep] = useState<Step>('reason');
  const [reason, setReason] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reasons = targetType === 'commission' ? COMMISSION_REPORT_REASONS : ARTIST_REPORT_REASONS;

  const previews = useMemo(
    () => proofFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [proofFiles],
  );

  const stepIndex = STEP_ORDER.indexOf(step);

  const canContinue =
    (step === 'reason' && reason !== null) ||
    (step === 'details' && description.trim().length >= MIN_DESCRIPTION_LENGTH) ||
    (step === 'proof' && proofFiles.length > 0) ||
    step === 'review';

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const images = Array.from(files).filter((f) => f.type.startsWith('image/'));
    setProofFiles((prev) => [...prev, ...images].slice(0, MAX_PROOF_FILES));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const { error } = await submitReport({
      reporterId,
      targetType,
      commissionId: commissionId ?? null,
      reportedProfileId,
      reasonCategory: reason,
      description: description.trim(),
      proofFiles,
    });
    setSubmitting(false);
    if (error) {
      setSubmitError(error);
      return;
    }
    setStep('done');
    onSubmitted?.();
  };

  const goNext = () => {
    if (step === 'review') {
      handleSubmit();
      return;
    }
    setStep(STEP_ORDER[stepIndex + 1]);
  };

  const goBack = () => {
    if (stepIndex > 0) setStep(STEP_ORDER[stepIndex - 1]);
  };

  return (
    <div
      className="rm-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Report ${targetType === 'commission' ? 'commission' : 'artist'}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="rm-modal">
        <div className="rm-header">
          <div>
            <div className="rm-kicker">
              Reporting {targetType === 'commission' ? 'commission' : 'artist'}:{' '}
              <strong>{targetLabel}</strong>
            </div>
            <h2 className="rm-title">{STEP_TITLES[step]}</h2>
          </div>
          <button className="rm-close" onClick={onClose} disabled={submitting} aria-label="Close">
            {'\u2715'}
          </button>
        </div>

        {step !== 'done' && (
          <div className="rm-progress" aria-hidden="true">
            {STEP_ORDER.map((s, i) => (
              <div key={s} className={`rm-progress-dot${i <= stepIndex ? ' active' : ''}`} />
            ))}
          </div>
        )}

        <div className="rm-body">
          {step === 'reason' && (
            <div className="rm-reasons">
              {reasons.map((r) => (
                <button
                  key={r}
                  className={`rm-reason-card${reason === r ? ' selected' : ''}`}
                  onClick={() => setReason(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {step === 'details' && (
            <div className="rm-details">
              <label className="rm-label" htmlFor="rm-description">
                Describe what happened. Include dates, usernames, and links where relevant.
              </label>
              <textarea
                id="rm-description"
                className="rm-textarea"
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the issue in detail..."
              />
              <div
                className={`rm-charcount${description.trim().length < MIN_DESCRIPTION_LENGTH ? ' insufficient' : ''}`}
              >
                {description.trim().length < MIN_DESCRIPTION_LENGTH
                  ? `At least ${MIN_DESCRIPTION_LENGTH} characters required (${description.trim().length}/${MIN_DESCRIPTION_LENGTH})`
                  : `${description.trim().length} characters`}
              </div>
            </div>
          )}

          {step === 'proof' && (
            <div className="rm-proof">
              <p className="rm-label">
                Proof is required. Upload 1{'\u2013'}{MAX_PROOF_FILES} screenshots that support your
                report (conversations, listings, payment records, etc.).
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                id="rm-proof-input"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <button
                className="rm-dropzone"
                onClick={() => fileInputRef.current?.click()}
                disabled={proofFiles.length >= MAX_PROOF_FILES}
              >
                {proofFiles.length >= MAX_PROOF_FILES
                  ? 'Maximum of 5 images reached'
                  : '+ Click to upload screenshots'}
              </button>
              {previews.length > 0 && (
                <div className="rm-previews">
                  {previews.map(({ file, url }, i) => (
                    <div key={`${file.name}-${i}`} className="rm-preview">
                      <img src={url || "/placeholder.svg"} alt={`Proof ${i + 1}: ${file.name}`} />
                      <button
                        className="rm-preview-remove"
                        aria-label={`Remove proof ${i + 1}`}
                        onClick={() =>
                          setProofFiles((prev) => prev.filter((_, idx) => idx !== i))
                        }
                      >
                        {'\u2715'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'review' && (
            <div className="rm-review">
              <dl className="rm-review-list">
                <div className="rm-review-row">
                  <dt>Target</dt>
                  <dd>
                    {targetType === 'commission' ? 'Commission' : 'Artist'}: {targetLabel}
                  </dd>
                </div>
                <div className="rm-review-row">
                  <dt>Reason</dt>
                  <dd>{reason}</dd>
                </div>
                <div className="rm-review-row">
                  <dt>Details</dt>
                  <dd className="rm-review-description">{description.trim()}</dd>
                </div>
                <div className="rm-review-row">
                  <dt>Proof</dt>
                  <dd>
                    {proofFiles.length} image{proofFiles.length === 1 ? '' : 's'} attached
                  </dd>
                </div>
              </dl>
              {submitError && <div className="rm-error">{submitError}</div>}
            </div>
          )}

          {step === 'done' && (
            <div className="rm-done">
              <div className="rm-done-icon" aria-hidden="true">{'\u2713'}</div>
              <p>
                Your report has been submitted. Our moderation team will review the ticket and take
                action if needed. Thank you for keeping CommIt safe.
              </p>
            </div>
          )}
        </div>

        <div className="rm-footer">
          {step === 'done' ? (
            <Button label="Close" color="var(--green)" onClick={onClose} />
          ) : (
            <>
              {stepIndex > 0 ? (
                <Button label="Back" color="var(--gray-bg)" onClick={goBack} disabled={submitting} />
              ) : (
                <span />
              )}
              <Button
                label={
                  step === 'review' ? (submitting ? 'Submitting...' : 'Submit report') : 'Continue'
                }
                color={step === 'review' ? 'var(--red)' : 'var(--blue)'}
                onClick={goNext}
                disabled={!canContinue || submitting}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
