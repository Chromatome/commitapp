import { supabase } from './supabase';

/**
 * Feature flag: SMS phone verification (OTP) during signup.
 *
 * Currently DISABLED because there is no paid Twilio account configured.
 *
 * To re-enable phone verification later:
 * 1. In the Supabase dashboard, go to Authentication -> Sign In / Providers -> Phone,
 *    enable the Phone provider, and enter your Twilio Account SID, Auth Token,
 *    and Messaging Service SID (or Twilio phone number).
 * 2. Set this flag to `true` (or set VITE_PHONE_VERIFICATION=true in env).
 *
 * No other code changes are needed — Login.tsx branches on this flag.
 */
export const PHONE_VERIFICATION_ENABLED: boolean =
  import.meta.env.VITE_PHONE_VERIFICATION === 'true';

export type AuthResult = { error: string | null };

/**
 * Direct signup WITHOUT phone verification.
 * The phone number is validated client-side and stored in user metadata
 * so it can be verified later once an SMS provider is configured.
 */
export async function signUpWithoutVerification(
  email: string,
  phoneE164: string,
  password: string,
): Promise<AuthResult> {
  const { error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        phone: phoneE164,
        phone_verified: false,
      },
    },
  });
  return { error: error ? error.message : null };
}

/**
 * OTP flow (used when PHONE_VERIFICATION_ENABLED is true).
 * Sends a 6-digit SMS code to the given phone number.
 */
export async function sendPhoneOtp(phoneE164: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithOtp({
    phone: phoneE164,
    options: { shouldCreateUser: true },
  });
  return { error: error ? error.message : null };
}

/**
 * OTP flow: verifies the SMS code, then attaches email + password
 * to the newly created (phone-verified) account.
 */
export async function verifyPhoneOtpAndCreateAccount(
  phoneE164: string,
  code: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  const { error: verifyError } = await supabase.auth.verifyOtp({
    phone: phoneE164,
    token: code.trim(),
    type: 'sms',
  });
  if (verifyError) return { error: verifyError.message };

  const { error: updateError } = await supabase.auth.updateUser({
    email: email.trim(),
    password,
  });
  if (updateError) {
    return { error: `Phone verified, but we couldn't save your email: ${updateError.message}` };
  }
  return { error: null };
}

/** Log out the current user and clear the session. */
export async function logOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();
  return { error: error ? error.message : null };
}

/** Log in with email or phone (E.164) + password. */
export async function logInWithPassword(
  identifier: { email: string } | { phone: string },
  password: string,
): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({
    ...identifier,
    password,
  });
  return { error: error ? error.message : null };
}
