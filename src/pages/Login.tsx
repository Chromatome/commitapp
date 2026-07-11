import React from 'react';
import '../styles/login.css';
import '../styles/styles.css';
import Background from '../components/Background';
import Button from '../components/Button';
import LinkButton from '../components/LinkButton';

type Mode = 'login' | 'signup';

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const isPhone = (value: string) => /^\+?[\d\s\-().]{7,20}$/.test(value.trim());

const Login: React.FC = () => {
  const [mode, setMode] = React.useState<Mode>('login');
  const [error, setError] = React.useState<string | null>(null);

  // Log in state — a single identifier (email OR phone)
  const [identifier, setIdentifier] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');

  // Sign up state — requires BOTH email and phone
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [signupPassword, setSignupPassword] = React.useState('');

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
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
    // TODO: hook up to auth backend
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) {
      setError('A valid email address is required to sign up.');
      return;
    }
    if (!isPhone(phone)) {
      setError('A valid phone number is required to sign up.');
      return;
    }
    if (signupPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError(null);
    // TODO: hook up to auth backend
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
        <div className="login-logo">CommIt</div>

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
                  <Button label="Log In" onClick={() => {}} color="var(--green)" style={{ width: '100%' } as React.CSSProperties} />
                </div>

                <div className="login-divider">new here?</div>
                <p className="login-switch">
                  <button type="button" onClick={() => switchMode('signup')}>
                    Create an account
                  </button>{' '}
                  to start commissioning art.
                </p>
              </form>
            ) : (
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
                    placeholder="(555) 123-4567"
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
                  Both email and phone are required to sign up — you can use either one to log in later.
                </p>

                <div className="login-submit-row">
                  <Button label="Sign Up" onClick={() => {}} color="var(--pink)" style={{ width: '100%' } as React.CSSProperties} />
                </div>

                <div className="login-divider">already a member?</div>
                <p className="login-switch">
                  <button type="button" onClick={() => switchMode('login')}>
                    Log in
                  </button>{' '}
                  with your email or phone number.
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
