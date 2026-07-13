import React, { useState } from 'react';
import {
  PAYMENT_TYPE_LABELS,
  createCommission,
  deleteCommission,
  updateCommission,
  type Commission,
  type CommissionInput,
  type CommissionPhase,
  type PaymentType,
} from '../../lib/profiles';

type EditablePhase = { name: string; description: string; price: string };

type FormState = {
  title: string;
  price: string;
  payment_type: PaymentType;
  split_upfront_percent: string;
  time_taken: string;
  tags: string;
  phases: EditablePhase[];
  artist_terms: string;
};

const EMPTY_FORM: FormState = {
  title: '',
  price: '',
  payment_type: 'upfront',
  split_upfront_percent: '50',
  time_taken: '',
  tags: '',
  phases: [],
  artist_terms: '',
};

const toForm = (c: Commission): FormState => ({
  title: c.title,
  price: String(c.price),
  payment_type: c.payment_type,
  split_upfront_percent: String(c.split_upfront_percent ?? 50),
  time_taken: c.time_taken,
  tags: c.tags.join(', '),
  phases: c.phases.map((p) => ({
    name: p.name,
    description: p.description ?? '',
    price: String(p.price),
  })),
  artist_terms: c.artist_terms,
});

const toInput = (f: FormState): CommissionInput => ({
  title: f.title.trim(),
  price: Math.max(0, Math.round(Number(f.price) || 0)),
  payment_type: f.payment_type,
  split_upfront_percent:
    f.payment_type === 'split'
      ? Math.min(99, Math.max(1, Math.round(Number(f.split_upfront_percent) || 50)))
      : null,
  time_taken: f.time_taken.trim(),
  tags: f.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10),
  phases: f.phases
    .filter((p) => p.name.trim().length > 0)
    .map(
      (p): CommissionPhase => ({
        name: p.name.trim(),
        description: p.description.trim(),
        price: Math.max(0, Math.round(Number(p.price) || 0)),
      })
    ),
  artist_terms: f.artist_terms.trim(),
});

const CommissionForm: React.FC<{
  initial: FormState;
  saving: boolean;
  onSave: (input: CommissionInput) => void;
  onCancel: () => void;
}> = ({ initial, saving, onSave, onCancel }) => {
  const [form, setForm] = useState<FormState>(initial);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setPhase = (i: number, patch: Partial<EditablePhase>) =>
    setForm((f) => ({
      ...f,
      phases: f.phases.map((p, j) => (j === i ? { ...p, ...patch } : p)),
    }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave(toInput(form));
  };

  return (
    <form className="pf-comm-form" onSubmit={handleSubmit}>
      <div className="pf-form-row">
        <label className="pf-field">
          <span>Title</span>
          <input
            type="text"
            value={form.title}
            maxLength={120}
            required
            onChange={(e) => set('title', e.target.value)}
          />
        </label>
        <label className="pf-field">
          <span>Price (credits)</span>
          <input
            type="number"
            min={0}
            value={form.price}
            required
            onChange={(e) => set('price', e.target.value)}
          />
        </label>
        <label className="pf-field">
          <span>Payment type</span>
          <select
            value={form.payment_type}
            onChange={(e) => set('payment_type', e.target.value as PaymentType)}
          >
            <option value="upfront">Upfront</option>
            <option value="installments">Installments</option>
            <option value="split">{'Split %/%'}</option>
          </select>
        </label>
        {form.payment_type === 'split' && (
          <label className="pf-field">
            <span>Upfront %</span>
            <input
              type="number"
              min={1}
              max={99}
              value={form.split_upfront_percent}
              onChange={(e) => set('split_upfront_percent', e.target.value)}
            />
          </label>
        )}
        <label className="pf-field">
          <span>Time taken</span>
          <input
            type="text"
            placeholder="e.g. ~2 weeks"
            maxLength={100}
            value={form.time_taken}
            onChange={(e) => set('time_taken', e.target.value)}
          />
        </label>
      </div>

      <label className="pf-field">
        <span>Tags (comma-separated, max 10)</span>
        <input
          type="text"
          placeholder="Digital Art, Illustration"
          value={form.tags}
          onChange={(e) => set('tags', e.target.value)}
        />
      </label>

      <div className="pf-field">
        <span>Phases of development (with price per phase)</span>
        {form.phases.map((phase, i) => (
          <div className="pf-phase-row" key={i}>
            <label className="pf-field">
              <span>Phase name</span>
              <input
                type="text"
                placeholder="e.g. Sketch"
                value={phase.name}
                onChange={(e) => setPhase(i, { name: e.target.value })}
              />
            </label>
            <label className="pf-field">
              <span>Description</span>
              <input
                type="text"
                placeholder="What happens in this phase"
                value={phase.description}
                onChange={(e) => setPhase(i, { description: e.target.value })}
              />
            </label>
            <label className="pf-field">
              <span>Price (credits)</span>
              <input
                type="number"
                min={0}
                value={phase.price}
                onChange={(e) => setPhase(i, { price: e.target.value })}
              />
            </label>
            <button
              type="button"
              className="pf-btn gray"
              onClick={() =>
                setForm((f) => ({ ...f, phases: f.phases.filter((_, j) => j !== i) }))
              }
            >
              Remove
            </button>
          </div>
        ))}
        <div>
          <button
            type="button"
            className="pf-btn"
            onClick={() =>
              setForm((f) => ({
                ...f,
                phases: [...f.phases, { name: '', description: '', price: '0' }],
              }))
            }
          >
            Add phase
          </button>
        </div>
      </div>

      <label className="pf-field">
        <span>Artist terms</span>
        <textarea
          maxLength={5000}
          placeholder="Your custom terms for this commission"
          value={form.artist_terms}
          onChange={(e) => set('artist_terms', e.target.value)}
        />
      </label>

      <div className="pf-edit-actions">
        <button type="submit" className="pf-btn green" disabled={saving}>
          {saving ? 'Saving...' : 'Save commission'}
        </button>
        <button type="button" className="pf-btn gray" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
};

const CommissionCard: React.FC<{
  commission: Commission;
  isOwn: boolean;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ commission, isOwn, onEdit, onDelete }) => {
  const paymentDetail =
    commission.payment_type === 'split' && commission.split_upfront_percent !== null
      ? `${commission.split_upfront_percent}% / ${100 - commission.split_upfront_percent}%`
      : PAYMENT_TYPE_LABELS[commission.payment_type];

  return (
    <article className="pf-comm-card">
      <a
        href={`/commission?id=${commission.id}`}
        aria-label={`View details for ${commission.title}`}
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        <div className="pf-comm-thumb" aria-hidden="true" />
      </a>
      <div className="pf-comm-meta">
        <span className="pf-comm-title">{commission.title}</span>
        <span className="pf-comm-price">{commission.price.toLocaleString()} Credits</span>
        <span className="pf-comm-detail">Payment: {paymentDetail}</span>
        {commission.time_taken && (
          <span className="pf-comm-detail">Time: {commission.time_taken}</span>
        )}
        <span className="pf-comm-detail">Sold {commission.times_sold} times</span>
        {commission.tags.length > 0 && (
          <span className="pf-comm-tags">
            {commission.tags.map((tag) => (
              <span className="mp-tag" key={tag}>
                {tag}
              </span>
            ))}
          </span>
        )}
        {commission.phases.length > 0 && (
          <div className="pf-comm-phases">
            {commission.phases.map((phase, i) => (
              <span className="pf-comm-phase" key={i} title={phase.description}>
                <span>{phase.name}</span>
                <span className="pf-comm-phase-price">{phase.price.toLocaleString()} cr</span>
              </span>
            ))}
          </div>
        )}
        {commission.artist_terms && (
          <span className="pf-comm-terms" title={commission.artist_terms}>
            Terms: {commission.artist_terms}
          </span>
        )}
        {isOwn && (
          <div className="pf-comm-actions">
            <button type="button" className="pf-btn" onClick={onEdit}>
              Edit
            </button>
            <button type="button" className="pf-btn gray" onClick={onDelete}>
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  );
};

const CommissionGallery: React.FC<{
  profileId: string;
  commissions: Commission[];
  isOwn: boolean;
  onChanged: () => void;
}> = ({ profileId, commissions, isOwn, onChanged }) => {
  const [editing, setEditing] = useState<'new' | string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (input: CommissionInput) => {
    setSaving(true);
    setError(null);
    try {
      if (editing === 'new') {
        await createCommission(profileId, input);
      } else if (editing) {
        await updateCommission(editing, input);
      }
      setEditing(null);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save commission.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this commission listing?')) return;
    setError(null);
    try {
      await deleteCommission(id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete commission.');
    }
  };

  const editingCommission =
    editing && editing !== 'new' ? commissions.find((c) => c.id === editing) : undefined;

  return (
    <section className="pf-panel">
      <div className="pf-section-header">
        <h2 className="pf-section-title">Commissions</h2>
        {isOwn && editing === null && (
          <button type="button" className="pf-btn green" onClick={() => setEditing('new')}>
            New commission
          </button>
        )}
      </div>

      {error && <p className="pf-error">{error}</p>}

      {editing !== null && (
        <CommissionForm
          key={editing}
          initial={editingCommission ? toForm(editingCommission) : EMPTY_FORM}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {commissions.length > 0 ? (
        <div className="pf-comm-grid">
          {commissions.map((c) => (
            <CommissionCard
              commission={c}
              key={c.id}
              isOwn={isOwn}
              onEdit={() => setEditing(c.id)}
              onDelete={() => handleDelete(c.id)}
            />
          ))}
        </div>
      ) : (
        editing === null && (
          <p className="pf-empty">
            {isOwn
              ? 'You have no commission listings yet. Create one to showcase your work!'
              : 'This artist has no commission listings yet.'}
          </p>
        )
      )}
    </section>
  );
};

export default CommissionGallery;
