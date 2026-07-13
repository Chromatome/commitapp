import React, { useState } from 'react';
import { useSearchParams } from 'react-router';
import useSWR from 'swr';
import '../styles/styles.css';
import '../styles/marketplace.css';
import '../styles/profile.css';
import Navbar from '../components/Navbar';
import Background from '../components/Background';
import ProfileHeader from '../components/profile/ProfileHeader';
import CommissionGallery from '../components/profile/CommissionGallery';
import ReviewList from '../components/profile/ReviewList';
import { useSession } from '../hooks/useSession';
import {
  followUser,
  getProfilePage,
  isFollowing,
  unfollowUser,
  updateMyProfile,
} from '../lib/profiles';

const AboutSection: React.FC<{
  profileId: string;
  aboutMe: string;
  isOwn: boolean;
  onSaved: () => void;
}> = ({ profileId, aboutMe, isOwn, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(aboutMe);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setDraft(aboutMe);
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateMyProfile(profileId, { about_me: draft.slice(0, 2000) });
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="pf-panel">
      <div className="pf-section-header">
        <h2 className="pf-section-title">About Me</h2>
        {isOwn && !editing && (
          <button type="button" className="pf-btn" onClick={startEditing}>
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="pf-about-edit">
          <textarea
            value={draft}
            maxLength={2000}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="About me"
          />
          {error && <p className="pf-error">{error}</p>}
          <div className="pf-edit-actions">
            <button type="button" className="pf-btn green" onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              className="pf-btn gray"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : aboutMe ? (
        <p className="pf-about-text">{aboutMe}</p>
      ) : (
        <p className="pf-about-text pf-about-empty">
          {isOwn ? 'Tell everyone about yourself and your art!' : 'Nothing here yet.'}
        </p>
      )}
    </section>
  );
};

const Profile: React.FC = () => {
  const [searchParams] = useSearchParams();
  const profileId = searchParams.get('id') ?? '';
  const { session } = useSession();
  const myId = session?.user?.id ?? null;
  const isOwn = myId !== null && myId === profileId;

  const {
    data: page,
    error: pageError,
    isLoading,
    mutate,
  } = useSWR(profileId ? ['profile-page', profileId] : null, () => getProfilePage(profileId));

  const { data: following, mutate: mutateFollowing } = useSWR(
    myId && profileId && !isOwn ? ['is-following', myId, profileId] : null,
    () => isFollowing(myId!, profileId)
  );

  const [followBusy, setFollowBusy] = useState(false);

  const toggleFollow = async () => {
    if (!myId || followBusy) return;
    setFollowBusy(true);
    try {
      if (following) {
        await unfollowUser(myId, profileId);
      } else {
        await followUser(myId, profileId);
      }
      await Promise.all([mutateFollowing(), mutate()]);
    } finally {
      setFollowBusy(false);
    }
  };

  const profile = page?.profile ?? null;

  return (
    <div className="profile-page">
      <Background direction="diagonal" speed={0.3} borderColor="rgba(0, 0, 0, 0.05)" />
      <Navbar />

      <main className="pf-body">
        {isLoading ? (
          <p className="pf-loading">Loading profile...</p>
        ) : !profileId || pageError || !profile ? (
          <p className="pf-notfound">
            {!profileId ? 'No profile specified.' : 'Profile not found.'}
          </p>
        ) : (
          <>
            <ProfileHeader
              profile={profile}
              socialLinks={page?.social_links ?? []}
              isOwn={isOwn}
              isFollowing={Boolean(following)}
              canFollow={Boolean(myId)}
              followBusy={followBusy}
              onToggleFollow={toggleFollow}
            />
            <AboutSection
              profileId={profile.id}
              aboutMe={profile.about_me}
              isOwn={isOwn}
              onSaved={() => mutate()}
            />
            <CommissionGallery
              profileId={profile.id}
              commissions={page?.commissions ?? []}
              isOwn={isOwn}
              onChanged={() => mutate()}
            />
            <ReviewList reviews={page?.reviews ?? []} />
          </>
        )}
      </main>
    </div>
  );
};

export default Profile;
