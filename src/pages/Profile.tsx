import React, { useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import useSWR from 'swr';
import '../styles/styles.css';
import '../styles/marketplace.css';
import '../styles/profile.css';
import Navbar from '../components/Navbar';
import Background from '../components/Background';
import Button from '../components/Button';
import { CommissionCard, type Commission as ListingCommission } from '../components/CommissionCard';
import ReportModal from '../components/ReportModal';
import { hasActiveReport } from '../lib/reports';
import { useSession } from '../hooks/useSession';
import { useMyProfile } from '../hooks/useMyProfile';
import {
  fetchProfilePageData,
  createCommission,
  updateCommission,
  updateProfile,
  uploadAvatar,
  uploadCommissionThumbnail,
  type Commission,
  type NewCommissionInput,
  type PaymentType,
} from '../lib/profileData';

// Same categories used by the marketplace filters.
const TAG_OPTIONS = ['Digital Art', 'Painting', 'Illustration', 'Sketch', '3D Art'];

// Map reputation (0-100) to an oklch hue: 25 (red) -> 145 (green).
const getReputationHue = (rep: number) => 25 + (Math.min(Math.max(rep, 0), 100) / 100) * 120;

// Badge icon slugs seeded in the badges table.
const BadgeIcon: React.FC<{ icon: string }> = ({ icon }) => {
  const paths: Record<string, string> = {
    heart:
      'M12 21s-7.5-4.9-9.9-9.2C.5 8.9 2.3 5.5 5.6 5.1c1.9-.2 3.6.7 4.6 2.2.5.8 1.1.8 1.6 0 1-1.5 2.7-2.4 4.6-2.2 3.3.4 5.1 3.8 3.5 6.7C19.5 16.1 12 21 12 21z',
    sparkles:
      'M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2zm7 11l.9 2.6L22.5 17l-2.6.9L19 20.5l-.9-2.6L15.5 17l2.6-.9L19 13zM5 14l.7 2L8 16.7l-2 .7L5.3 19l-.7-2-2.3-.7 2-.7L5 14z',
    trophy:
      'M6 2h12v2h4v3a5 5 0 01-5 5h-.4A6 6 0 0113 15.9V18h3v2H8v-2h3v-2.1A6 6 0 017.4 12H7a5 5 0 01-5-5V4h4V2zm12 4v4a3 3 0 003-3V6h-3zM6 6H3v1a3 3 0 003 3V6z',
    shield:
      'M12 2l8 3v6c0 5.25-3.4 9.74-8 11-4.6-1.26-8-5.75-8-11V5l8-3z',
    'badge-check':
      'M12 2l2.4 2.4 3.4-.5.5 3.4L21 9.7l-1.5 3 1.5 3-2.7 2.4-.5 3.4-3.4-.5L12 23l-2.4-2.4-3.4.5-.5-3.4L3 15.3l1.5-3-1.5-3 2.7-2.4.5-3.4 3.4.5L12 2zm-1.2 13.4l5-5-1.4-1.4-3.6 3.6-1.6-1.6-1.4 1.4 3 3z',
  };
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={paths[icon] ?? paths['badge-check']} />
    </svg>
  );
};

// ----- Create commission form (parameters mirror the commission info page) -----

type FormState = {
  title: string;
  price: string;
  paymentType: PaymentType;
  splitPercent: string;
  timeTaken: string;
  phases: string;
  tags: string[];
  artistTerms: string;
  /** Number of purchase spots; empty string = unlimited. */
  stock: string;
};

const INITIAL_FORM: FormState = {
  title: '',
  price: '',
  paymentType: 'upfront',
  splitPercent: '50',
  timeTaken: '',
  phases: 'Sketch, Line Art, Colored, Rendered/Final',
  tags: [],
  artistTerms: '',
  stock: '',
};

/** Prefill the form from an existing commission when editing. */
const formFromCommission = (c: Commission): FormState => ({
  title: c.title,
  price: String(c.price),
  paymentType: c.payment_type,
  splitPercent: String(c.split_upfront_percent ?? 50),
  timeTaken: c.time_taken,
  phases: c.phases.join(', '),
  tags: c.tags,
  artistTerms: c.artist_terms,
  stock: c.stock === null ? '' : String(c.stock),
});

const CommissionForm: React.FC<{
  profileId: string;
  /** When set, the form edits this commission instead of creating a new one. */
  existing?: Commission | null;
  onCreated: () => void;
}> = ({ profileId, existing = null, onCreated }) => {
  const [form, setForm] = useState<FormState>(existing ? formFromCommission(existing) : INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Thumbnail: held locally (with an object-URL preview) until the
  // commission is created, since the upload path is keyed by commission id.
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(existing?.thumbnail_url ?? null);
  const [thumbError, setThumbError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleTag = (tag: string) =>
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));

  const handleThumbFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setThumbError('Please choose an image file (PNG, JPG, WebP, or GIF).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setThumbError('Image must be 5MB or smaller.');
      return;
    }
    setThumbError(null);
    setThumbFile(file);
    setThumbPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const clearThumb = () => {
    setThumbPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setThumbFile(null);
    setThumbError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const title = form.title.trim();
    const price = Number(form.price);
    if (title.length < 1 || title.length > 120) {
      setError('Title must be between 1 and 120 characters.');
      return;
    }
    if (!Number.isInteger(price) || price < 0) {
      setError('Price must be a whole number of credits (0 or more).');
      return;
    }
    const splitPercent = Number(form.splitPercent);
    if (form.paymentType === 'split' && (!Number.isInteger(splitPercent) || splitPercent < 1 || splitPercent > 99)) {
      setError('Upfront percentage must be a whole number between 1 and 99.');
      return;
    }
    const stockStr = form.stock.trim();
    const stock = stockStr === '' ? null : Number(stockStr);
    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) {
      setError('Stock must be a whole number of spots (0 or more), or left empty for unlimited.');
      return;
    }

    const input: NewCommissionInput = {
      title,
      price,
      payment_type: form.paymentType,
      split_upfront_percent: form.paymentType === 'split' ? splitPercent : null,
      time_taken: form.timeTaken,
      tags: form.tags,
      phases: form.phases
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
      artist_terms: form.artistTerms,
      stock,
    };

    setSubmitting(true);
    try {
      let id = existing?.id ?? null;
      if (existing) {
        const { error: updateError } = await updateCommission(existing.id, input);
        if (updateError) {
          setError(updateError);
          return;
        }
      } else {
        const { id: newId, error: createError } = await createCommission(profileId, input);
        if (createError || !newId) {
          setError(createError ?? 'Something went wrong creating the commission. Please try again.');
          return;
        }
        id = newId;
      }

      let thumbWarning: string | null = null;
      if (thumbFile && id) {
        const { error: thumbUploadError } = await uploadCommissionThumbnail(id, profileId, thumbFile);
        if (thumbUploadError) {
          thumbWarning = ` (thumbnail failed to upload: ${thumbUploadError})`;
        }
      }

      if (!existing) {
        setForm(INITIAL_FORM);
        clearThumb();
      }
      setNotice(
        existing
          ? `Commission updated!${thumbWarning ?? ''}`
          : `Commission listed! It now appears in your gallery below.${thumbWarning ?? ''}`,
      );
      onCreated();
    } catch {
      setError('Something went wrong saving the commission. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="pf-form" onSubmit={handleSubmit}>
      <div className="pf-form-grid">
        <div className="pf-field pf-field-wide">
          <span className="pf-field-label">Thumbnail</span>
          <div className="pf-thumb-upload-row">
            <div className="pf-thumb-upload" aria-hidden={!thumbPreview}>
              {thumbPreview ? (
                <img src={thumbPreview || "/placeholder.svg"} alt="" className="pf-thumb-upload-img" />
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M4 5a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2h-3.17l-1.24-1.5a2 2 0 00-1.54-.5H9.95a2 2 0 00-1.54.5L7.17 5H4zm8 4a4 4 0 110 8 4 4 0 010-8z" />
                </svg>
              )}
            </div>
            <div className="pf-thumb-upload-actions">
              <button
                type="button"
                className="pf-avatar-edit"
                onClick={() => thumbInputRef.current?.click()}
              >
                {thumbPreview ? 'Change image' : 'Add thumbnail'}
              </button>
              {thumbPreview && (
                <button type="button" className="pf-avatar-edit" onClick={clearThumb}>
                  Remove
                </button>
              )}
              <input
                ref={thumbInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                aria-label="Upload a thumbnail image for this commission"
                onChange={handleThumbFile}
              />
            </div>
          </div>
          {thumbError && (
            <p className="pf-form-error pf-avatar-error" role="alert">
              {thumbError}
            </p>
          )}
        </div>

        <label className="pf-field">
          <span className="pf-field-label">Title</span>
          <input
            type="text"
            value={form.title}
            maxLength={120}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Full Body Character Illustration"
            required
          />
        </label>

        <label className="pf-field">
          <span className="pf-field-label">Price (Credits)</span>
          <input
            type="number"
            min={0}
            step={1}
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
            placeholder="1000"
            required
          />
        </label>

        <label className="pf-field">
          <span className="pf-field-label">Stock (spots)</span>
          <input
            type="number"
            min={0}
            step={1}
            value={form.stock}
            onChange={(e) => set('stock', e.target.value)}
            placeholder="Leave empty for unlimited"
            aria-describedby="pf-stock-hint"
          />
          <span id="pf-stock-hint" className="pf-field-hint">
            Only this many people can purchase. Empty = unlimited.
          </span>
        </label>

        <label className="pf-field">
          <span className="pf-field-label">Payment Type</span>
          <select
            value={form.paymentType}
            onChange={(e) => set('paymentType', e.target.value as PaymentType)}
          >
            <option value="upfront">Upfront</option>
            <option value="installments">Installments Per Phase (Even)</option>
            <option value="split">Split (Upfront % + Rest On Delivery)</option>
          </select>
        </label>

        {form.paymentType === 'split' && (
          <label className="pf-field">
            <span className="pf-field-label">Upfront %</span>
            <input
              type="number"
              min={1}
              max={99}
              step={1}
              value={form.splitPercent}
              onChange={(e) => set('splitPercent', e.target.value)}
              required
            />
          </label>
        )}

        <label className="pf-field">
          <span className="pf-field-label">Estimated Time</span>
          <input
            type="text"
            value={form.timeTaken}
            maxLength={100}
            onChange={(e) => set('timeTaken', e.target.value)}
            placeholder="e.g. ~1 month"
          />
        </label>

        <label className="pf-field pf-field-wide">
          <span className="pf-field-label">Phases (comma separated)</span>
          <input
            type="text"
            value={form.phases}
            onChange={(e) => set('phases', e.target.value)}
            placeholder="Sketch, Line Art, Colored, Rendered/Final"
          />
        </label>

        <fieldset className="pf-field pf-field-wide pf-tags-fieldset">
          <legend className="pf-field-label">Tags</legend>
          <div className="pf-tag-options">
            {TAG_OPTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`pf-tag-btn${form.tags.includes(tag) ? ' active' : ''}`}
                aria-pressed={form.tags.includes(tag)}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="pf-field pf-field-wide">
          <span className="pf-field-label">Artist Terms</span>
          <textarea
            value={form.artistTerms}
            maxLength={5000}
            rows={3}
            onChange={(e) => set('artistTerms', e.target.value)}
            placeholder="Your custom terms: revisions, usage rights, refunds..."
          />
        </label>
      </div>

      {error && (
        <p className="pf-form-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="pf-form-notice">{notice}</p>}

      <div className="pf-form-submit">
        <Button
          label={submitting ? 'Saving…' : existing ? 'Save Changes' : 'List Commission'}
          onClick={() => {}}
          type="submit"
          disabled={submitting}
          color="var(--pink)"
        />
      </div>
    </form>
  );
};

// ----- Page -----

const Profile: React.FC = () => {
  const { session, checking } = useSession();
  const viewerId = session?.user?.id;
  const navigate = useNavigate();

  // /profile shows the signed-in user's own profile; /profile?id={id}
  // shows anyone's. Every mutation below still targets `viewerId` (never
  // the id from the URL), so a visitor can only ever act as themselves.
  const [searchParams] = useSearchParams();
  const requestedId = searchParams.get('id');
  const profileId = requestedId || viewerId;
  const isOwnProfile = Boolean(viewerId) && profileId === viewerId;

  const [showForm, setShowForm] = useState(false);
  /** Commission currently being edited (own profile only). */
  const [editingCommission, setEditingCommission] = useState<Commission | null>(null);

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const { mutate: mutateMyProfile } = useMyProfile();

  // About me editing state
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutDraft, setAboutDraft] = useState('');
  const [savingAbout, setSavingAbout] = useState(false);
  const [aboutError, setAboutError] = useState<string | null>(null);

  // Report artist state
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    profileId ? ['profile-page', profileId] : null,
    () => fetchProfilePageData(profileId as string),
  );

  // Whether the viewer already has an active report against this artist —
  // shared SWR key so it revalidates consistently across visits.
  const { data: alreadyReportedArtist, mutate: mutateReported } = useSWR(
    viewerId && profileId && viewerId !== profileId
      ? ['artist-reported', viewerId, profileId]
      : null,
    () => hasActiveReport(viewerId as string, { reportedProfileId: profileId as string }),
  );

  if (checking) return null;

  if (!profileId) {
    return (
      <div className="profile-page">
        <Background direction="diagonal" speed={0.3} borderColor="rgba(0, 0, 0, 0.05)" />
        <Navbar />
        <div className="pf-body">
          <section className="pf-panel">
            <p className="pf-error" role="alert">
              No profile specified.
            </p>
          </section>
        </div>
      </div>
    );
  }

  const reputation = data?.profile.reputation ?? 50;
  const repHue = getReputationHue(reputation);
  // Artists with fewer than 5 sales haven't built up an established
  // reputation yet, so we show a "New Artist" indicator instead.
  const salesCount = data?.profile.sales_count ?? 0;
  const isNewArtist = salesCount < 5;
  // Fall back to email prefix only for the viewer's own not-yet-created row.
  const username =
    data?.profile.username ||
    (isOwnProfile ? session?.user?.email?.split('@')[0] : null) ||
    'Unnamed Artist';
  const avatarUrl = data?.profile.avatar_url ?? null;
  const aboutMe = data?.profile.about_me ?? '';

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !viewerId || !isOwnProfile) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file (PNG, JPG, WebP, or GIF).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image must be 5MB or smaller.');
      return;
    }
    setAvatarError(null);
    setUploading(true);
    try {
      const { error: uploadError } = await uploadAvatar(viewerId, file);
      if (uploadError) {
        setAvatarError(uploadError);
        return;
      }
      // Refresh this page's data and the shared profile (marketplace sidebar).
      mutate();
      mutateMyProfile();
    } catch {
      setAvatarError('Something went wrong uploading the image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const startEditingAbout = () => {
    if (!isOwnProfile) return;
    setAboutDraft(aboutMe);
    setAboutError(null);
    setEditingAbout(true);
  };

  const saveAbout = async () => {
    if (!viewerId || !isOwnProfile) return;
    setSavingAbout(true);
    setAboutError(null);
    try {
      const { error: saveError } = await updateProfile(viewerId, { about_me: aboutDraft.trim() });
      if (saveError) {
        setAboutError(saveError);
        return;
      }
      setEditingAbout(false);
      mutate();
      mutateMyProfile();
    } catch {
      setAboutError('Something went wrong saving. Please try again.');
    } finally {
      setSavingAbout(false);
    }
  };

  return (
    <div className="profile-page">
      <Background direction="diagonal" speed={0.3} borderColor="rgba(0, 0, 0, 0.05)" />

      <Navbar />

      <div className="pf-body">
        {/* ---- Header: avatar left, identity right ---- */}
        <header className="pf-header">
          <div className="pf-avatar-wrap">
            <div className="pf-avatar">
              {avatarUrl ? (
                <img src={avatarUrl || "/placeholder.svg"} alt={`${username}'s profile picture`} className="pf-avatar-img" />
              ) : (
                <svg width="72" height="72" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5.33 0-8 2.67-8 6v2h16v-2c0-3.33-2.67-6-8-6z" />
                </svg>
              )}
            </div>
            {isOwnProfile && (
              <>
                <button
                  type="button"
                  className="pf-avatar-edit"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading…' : 'Change'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  aria-label="Upload a new profile picture"
                  onChange={handleAvatarFile}
                />
                {avatarError && (
                  <p className="pf-form-error pf-avatar-error" role="alert">
                    {avatarError}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="pf-identity">
            <h1 className="pf-username">{username}</h1>

            <ul className="pf-badges" aria-label="Badges">
              {data && data.badges.length > 0 ? (
                data.badges.map((badge) => (
                  <li className="pf-badge" key={badge.slug} title={badge.description}>
                    <BadgeIcon icon={badge.icon} />
                    {badge.name}
                  </li>
                ))
              ) : (
                <li className="pf-badge pf-badge-empty">No badges yet</li>
              )}
            </ul>

            <div className="pf-reputation">
              <span className="pf-rep-label">
                {isNewArtist ? 'New Artist' : `${reputation}/100 Reputation`}
              </span>
              <div
                className="pf-rep-bar"
                role="progressbar"
                aria-valuenow={isNewArtist ? 100 : reputation}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={isNewArtist ? 'New Artist' : 'Reputation'}
              >
                <div
                  className={`pf-rep-bar-fill${isNewArtist ? ' pf-rep-bar-fill-new' : ''}`}
                  style={
                    isNewArtist
                      ? { width: '100%' }
                      : {
                          width: `${reputation}%`,
                          backgroundColor: `oklch(0.72 0.17 ${repHue})`,
                        }
                  }
                />
              </div>
            </div>
          </div>

          {isOwnProfile && (
            <div className="pf-header-actions">
              <Button
                label={showForm ? 'Close' : 'Create a Commission'}
                onClick={() => setShowForm((s) => !s)}
                color="var(--pink)"
              />
            </div>
          )}

          {!isOwnProfile && viewerId && profileId && (
            <div className="pf-header-actions">
              <Button
                label="Message"
                onClick={() => navigate(`/messages?with=${profileId}`)}
                color="var(--gray-bg)"
              />
              <button
                type="button"
                className="pf-report-link"
                disabled={Boolean(alreadyReportedArtist)}
                onClick={() => setReportModalOpen(true)}
              >
                {alreadyReportedArtist ? 'Report submitted — under review' : 'Report artist'}
              </button>
            </div>
          )}
        </header>

        <div className="pf-panels">
        {/* ---- About me ---- */}
        <section className="pf-panel" aria-label="About me">
          <div className="pf-panel-header">
            <h2 className="pf-panel-title">About Me</h2>
            {isOwnProfile && !editingAbout && (
              <button type="button" className="pf-edit-btn" onClick={startEditingAbout}>
                Edit
              </button>
            )}
          </div>
          {editingAbout ? (
            <div className="pf-about-edit">
              <textarea
                value={aboutDraft}
                maxLength={2000}
                rows={4}
                onChange={(e) => setAboutDraft(e.target.value)}
                placeholder="Tell people about yourself, your art style, what you love to draw..."
                aria-label="About me"
              />
              {aboutError && (
                <p className="pf-form-error" role="alert">
                  {aboutError}
                </p>
              )}
              <div className="pf-about-actions">
                <Button
                  label={savingAbout ? 'Saving…' : 'Save'}
                  onClick={saveAbout}
                  disabled={savingAbout}
                  color="var(--green)"
                />
                <Button
                  label="Cancel"
                  onClick={() => setEditingAbout(false)}
                  disabled={savingAbout}
                  color="#e9e9e9"
                />
              </div>
            </div>
          ) : aboutMe ? (
            <p className="pf-about-text">{aboutMe}</p>
          ) : (
            <p className="pf-muted">
              {isOwnProfile
                ? 'Nothing here yet — use Edit to tell people about yourself and your art.'
                : 'Nothing here yet.'}
            </p>
          )}
        </section>

        {/* ---- Create commission (anyone can become an artist, only on your own profile) ---- */}
        {isOwnProfile && showForm && viewerId && (
          <section className="pf-panel" aria-label="Create a commission">
            <h2 className="pf-panel-title">New Commission</h2>
            <CommissionForm
              profileId={viewerId}
              onCreated={() => {
                mutate();
                setShowForm(false);
              }}
            />
          </section>
        )}

        {/* ---- Edit an existing commission ---- */}
        {isOwnProfile && editingCommission && viewerId && (
          <section className="pf-panel" aria-label="Edit commission">
            <div className="pf-panel-header">
              <h2 className="pf-panel-title">Edit &quot;{editingCommission.title}&quot;</h2>
              <button
                type="button"
                className="pf-edit-btn"
                onClick={() => setEditingCommission(null)}
              >
                Cancel
              </button>
            </div>
            <CommissionForm
              key={editingCommission.id}
              profileId={viewerId}
              existing={editingCommission}
              onCreated={() => {
                mutate();
                setEditingCommission(null);
              }}
            />
          </section>
        )}

        {error && (
          <section className="pf-panel">
            <p className="pf-error" role="alert">
              Couldn&apos;t load this profile: {error.message}
            </p>
          </section>
        )}

        {/* ---- Latest reviews on this artist's commissions ---- */}
        
        <section className="pf-panel" aria-label="Latest reviews">
          <h2 className="pf-panel-title">Latest Reviews</h2>
          {isLoading ? (
            <p className="pf-muted">Loading reviews…</p>
          ) : data && data.reviews.length > 0 ? (
            <div className="pf-review-list">
              {data.reviews.map((review) => (
                <article className="pf-review" key={review.id}>
                  <header className="pf-review-header">
                    <span className="pf-review-customer">{review.reviewer_name}</span>
                    {review.reviewer_reputation !== null && (
                      <span className="pf-review-rep">{review.reviewer_reputation}/100 Rep</span>
                    )}
                    <span className="pf-review-comm">on {review.commission_title}</span>
                    <span className="pf-review-rating">Rating: {review.rating}/5</span>
                  </header>
                  {review.text && <p className="pf-review-text">{review.text}</p>}
                </article>
              ))}
            </div>
          ) : (
            <p className="pf-muted">
              {isOwnProfile
                ? 'No reviews yet — reviews on your listed commissions will show up here.'
                : 'No reviews yet.'}
            </p>
          )}
        </section>
        </div>

        {/* ---- Commission gallery (marketplace formatting) ---- */}
        <section className="pf-panel" aria-label="Listed commissions">
          <h2 className="pf-panel-title">Commissions</h2>
          {isLoading ? (
            <p className="pf-muted">Loading commissions…</p>
          ) : data && data.commissions.length > 0 ? (
            <div className="mp-grid">
              {data.commissions.map((c) => {
                const listing: ListingCommission = {
                  id: c.id,
                  title: c.title,
                  artist: username,
                  price: c.price,
                  tags: c.tags,
                  reputation,
                  thumbnailUrl: c.thumbnail_url,
                };
                return (
                  <div className="pf-comm-card" key={c.id}>
                    <CommissionCard commission={listing} />
                    <div className="pf-comm-card-meta">
                      <span className="pf-comm-stock">
                        {c.stock === null
                          ? 'Unlimited spots'
                          : c.stock === 0
                            ? 'Sold out'
                            : `${c.stock} spot${c.stock === 1 ? '' : 's'} left`}
                      </span>
                      {isOwnProfile && (
                        <button
                          type="button"
                          className="pf-edit-btn"
                          onClick={() => {
                            setEditingCommission(c);
                            setShowForm(false);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="pf-muted">
              {isOwnProfile
                ? 'No commissions listed yet. Use "Create a Commission" above to list your first one and become an artist.'
                : 'No commissions listed yet.'}
            </p>
          )}
        </section>
      </div>

      {reportModalOpen && viewerId && profileId && !isOwnProfile && (
        <ReportModal
          targetType="artist"
          reportedProfileId={profileId}
          targetLabel={username}
          reporterId={viewerId}
          onClose={() => setReportModalOpen(false)}
          onSubmitted={() => mutateReported(true, { revalidate: false })}
        />
      )}
    </div>
  );
};

export default Profile;
