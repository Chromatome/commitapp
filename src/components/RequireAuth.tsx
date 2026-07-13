import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useSession } from '../hooks/useSession';

/**
 * Route guard: only renders its children when a Supabase session exists.
 * Unauthenticated visitors are redirected to /login (the original
 * destination is preserved in location state so login can return them).
 */
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { session, checking } = useSession();

  if (checking) return null;

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default RequireAuth;
