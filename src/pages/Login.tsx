import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import '../styles/login.css';
import '../styles/styles.css';
import Background from '../components/Background';
import Button from '../components/Button';
import LinkButton from '../components/LinkButton';
import logo from "../assets/commitsticker.png";
import {
  PHONE_VERIFICATION_ENABLED,
  signUpWithoutVerification,
  sendPhoneOtp,
  verifyPhoneOtpAndCreateAccount,
  logInWithPassword,
} from '../lib/auth';
import { supabase } from '../lib/supabase';
import { updateProfile } from '../lib/profileData';

type Mode = 'login' | 'signup';
type SignupStep = 'details' | 'verify' | 'username';

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,30}$/;

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const isPhone = (value: string) => /^\+?[\d\s\-().]{7,20}$/.test(value.trim());

/** Normalize a phone number to E.164 format (required by Supabase). Assumes US (+1) when no country code given. */
const toE164 = (value: string): string | null => {
  const digits = value.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    const rest = digits.slice(1).replace(/\D/g, '');
    return rest.length >= 7 && rest.length <= 15 ? `+${rest}` : null;
  }
  const onlyDigits = digits.replace(/\D/g, '');
  if (onlyDigits.length === 10) return `+1${onlyDigits}`;
  if (onlyDigits.length === 11 && onlyDigits.startsWith('1')) return `+${onlyDigits}`;
  return null;
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Where to send the user after auth (set by RequireAuth redirects).
  const from = (location.state as { from?: string } | null)?.from ?? '/marketplace';
  const [mode, setMode] = React.useState<Mode>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'login',
  );
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const [identifier, setIdentifier] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');

  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [signupPassword, setSignupPassword] = React.useState('');

  const [signupStep, setSignupStep] = React.useState<SignupStep>('details');
  const [otpCode, setOtpCode] = React.useState('');
  const [verifiedPhone, setVerifiedPhone] = React.useState<string | null>(null);
  const [username, setUsername] = React.useState('');

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setSignupStep('details');
    setOtpCode('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!identifier.trim()) {
      setError('Enter your email or phone number to log in.');
      return;
    }
    if (!isEmail(identifier) && !isPhone(identifier)) {
      setError("That doesn't look like a valid email or phone number.");
      return;
    }
    if (!loginPassword) {
      setError('Enter your password.');
      return;
    }
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      let result;
      if (isEmail(identifier)) {
        result = await logInWithPassword({ email: identifier.trim() }, loginPassword);
      } else {
        const e164 = toE164(identifier);
        if (!e164) {
          setError('Please include your country code, e.g. +1 (555) 123-4567.');
          setLoading(false);
          return;
        }
        result = await logInWithPassword({ phone: e164 }, loginPassword);
      }

      if (result.error) {
        setError(result.error);
        return;
      }
      navigate(from);
    } catch {
      setError('Something went wrong logging in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!isEmail(email)) {
      setError('A valid email address is required to sign up.');
      return;
    }
    if (!isPhone(phone)) {
      setError('A valid phone number is required to sign up.');
      return;
    }
    const e164 = toE164(phone);
    if (!e164) {
      setError('Please enter a valid phone number, e.g. +1 (555) 123-4567.');
      return;
    }
    if (signupPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      if (PHONE_VERIFICATION_ENABLED) {
        const { error: otpError } = await sendPhoneOtp(e164);
        if (otpError) {
          setError(otpError);
          return;
        }
        setVerifiedPhone(e164);
        setSignupStep('verify');
        setNotice(`We sent a 6-digit code to ${e164}. Enter it below to verify your phone.`);
      } else {
        const { error: signupError } = await signUpWithoutVerification(email, e164, signupPassword);
        if (signupError) {
          setError(signupError);
          return;
        }
        // Account created — now ask the new user to pick a username.
        setSignupStep('username');
        setNotice('Account created! Pick a username to finish setting up your profile.');
      }
    } catch {
      setError('Something went wrong creating your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !verifiedPhone) return;
    if (!/^\d{6}$/.test(otpCode.trim())) {
      setError('Enter the 6-digit code from the text message.');
      return;
    }
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      const { error: verifyError } = await verifyPhoneOtpAndCreateAccount(
        verifiedPhone,
        otpCode,
        email,
        signupPassword,
      );
      if (verifyError) {
        setError(verifyError);
        return;
      }

      // Phone verified and account created — now ask the new user to pick a username.
      setSignupStep('username');
      setNotice('Phone verified! Pick a username to finish setting up your profile.');
    } catch {
      setError('Something went wrong verifying the code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const name = username.trim();
    if (!USERNAME_RE.test(name)) {
      setError('Username must be 3-30 characters: letters, numbers, hyphens, or underscores.');
      return;
    }
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) {
        // No active session (e.g. email confirmation required) — skip for now.
        navigate(from);
        return;
      }
      const { error: saveError } = await updateProfile(userId, { username: name });
      if (saveError) {
        setError(
          saveError.toLowerCase().includes('duplicate') || saveError.toLowerCase().includes('unique')
            ? 'That username is taken — try another one.'
            : saveError,
        );
        return;
      }
      navigate(from);
    } catch {
      setError('Something went wrong saving your username. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (loading || !verifiedPhone) return;
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const { error: otpError } = await sendPhoneOtp(verifiedPhone);
      if (otpError) {
        setError(otpError);
      } else {
        setNotice(`A new code was sent to ${verifiedPhone}.`);
      }
    } catch {
      setError('Could not resend the code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Background
        direction="diagonal"
        speed={0.3}
        borderColor="rgba(0, 0, 0, 0.05)"
      />

      <header className="login-nav">
        <LinkButton label="Home" href="/" color="var(--gray-bg)" />
      </header>

      <main>
        <div className="login-logo">
          <img src={logo} alt="CommIt logo" />
        </div>

        <div className="login-card-glow">
          <div className="login-card">
            <div className="login-tabs" role="tablist" aria-label="Authentication mode">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                className={`login-tab ${mode === 'login' ? 'active' : ''}`}
                onClick={() => switchMode('login')}
              >
                Log In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                className={`login-tab tab-signup ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => switchMode('signup')}
              >
                Sign Up
              </button>
            </div>

            {error && <div className="login-error" role="alert">{error}</div>}
            {notice && <div className="login-notice" role="status">{notice}</div>}

            {mode === 'login' ? (
              <form className="login-form" onSubmit={handleLogin}>
                <div className="login-field">
                  <label htmlFor="identifier">Email or Phone Number</label>
                  <input
                    id="identifier"
                    type="text"
                    autoComplete="username"
                    placeholder="you@example.com or (555) 123-4567"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                </div>

                <div className="login-field">
                  <label htmlFor="login-password">Password</label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>

                <div className="login-submit-row">
                  <Button
                    label={loading ? 'Logging In…' : 'Log In'}
                    onClick={() => {}}
                    type="submit"
                    disabled={loading}
                    color="var(--green)"
                    style={{ width: '100%' } as React.CSSProperties}
                  />
                </div>

                <div className="login-divider">new here?</div>
                <p className="login-switch">
                  <button type="button" onClick={() => switchMode('signup')}>
                    Create an account
                  </button>{' '}
                  to start commissioning art.
                </p>
              </form>
            ) : signupStep === 'details' ? (
              <form className="login-form" onSubmit={handleSignup}>
                <div className="login-field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="login-field">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+1 (555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="login-field">
                  <label htmlFor="signup-password">Password</label>
                  <input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                  />
                </div>

                <p className="login-hint">
                  {PHONE_VERIFICATION_ENABLED
                    ? "Both email and phone are required to sign up — we'll text you a code to verify your number before creating your account."
                    : 'Both email and a valid phone number are required to sign up.'}
                </p>

                <div className="login-submit-row">
                  <Button
                    label={
                      loading
                        ? PHONE_VERIFICATION_ENABLED
                          ? 'Sending Code…'
                          : 'Creating Account…'
                        : PHONE_VERIFICATION_ENABLED
                          ? 'Send Verification Code'
                          : 'Create Account'
                    }
                    onClick={() => {}}
                    type="submit"
                    disabled={loading}
                    color="var(--pink)"
                    style={{ width: '100%' } as React.CSSProperties}
                  />
                </div>

                <div className="login-divider">already a member?</div>
                <p className="login-switch">
                  <button type="button" onClick={() => switchMode('login')}>
                    Log in
                  </button>{' '}
                  with your email or phone number.
                </p>
              </form>
            ) : signupStep === 'username' ? (
              <form className="login-form" onSubmit={handleSetUsername}>
                <div className="login-field">
                  <label htmlFor="username">Username</label>
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    maxLength={30}
                    placeholder="e.g. inkwizard"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <p className="login-hint">
                  This is the name other users will see on your profile and commissions. 3-30
                  characters: letters, numbers, hyphens, or underscores.
                </p>

                <div className="login-submit-row">
                  <Button
                    label={loading ? 'Saving…' : 'Set Username'}
                    onClick={() => {}}
                    type="submit"
                    disabled={loading}
                    color="var(--pink)"
                    style={{ width: '100%' } as React.CSSProperties}
                  />
                </div>

                <p className="login-switch">
                  <button type="button" onClick={() => navigate(from)} disabled={loading}>
                    Skip for now
                  </button>{' '}
                  and keep the automatically generated one.
                </p>
              </form>
            ) : (
              <form className="login-form" onSubmit={handleVerifyOtp}>
                <div className="login-field">
                  <label htmlFor="otp">Verification Code</label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                <p className="login-hint">
                  Enter the 6-digit code we texted to your phone to finish creating your account.
                </p>

                <div className="login-submit-row">
                  <Button
                    label={loading ? 'Verifying…' : 'Verify & Create Account'}
                    onClick={() => {}}
                    type="submit"
                    disabled={loading}
                    color="var(--pink)"
                    style={{ width: '100%' } as React.CSSProperties}
                  />
                </div>

                <p className="login-switch">
                  Didn&apos;t get it?{' '}
                  <button type="button" onClick={handleResendOtp} disabled={loading}>
                    Resend code
                  </button>{' '}
                  or{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setSignupStep('details');
                      setOtpCode('');
                      setError(null);
                      setNotice(null);
                    }}
                  >
                    go back
                  </button>
                  .
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
