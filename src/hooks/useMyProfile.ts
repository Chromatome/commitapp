import useSWR from 'swr';
import { useSession } from './useSession';
import { fetchOwnProfile, type Profile } from '../lib/profileData';

/**
 * The logged-in user's own profile row, shared app-wide via SWR
 * (key: ['my-profile', userId]). Mutating this key after avatar or
 * username changes keeps the marketplace sidebar, navbar, and profile
 * page all in sync.
 */
export function useMyProfile() {
  const { session, checking } = useSession();
  const userId = session?.user?.id;

  const { data, error, isLoading, mutate } = useSWR<Profile | null>(
    userId ? ['my-profile', userId] : null,
    () => fetchOwnProfile(userId as string),
  );

  return {
    profile: data ?? null,
    userId,
    checking,
    loading: isLoading,
    error,
    mutate,
  };
}
