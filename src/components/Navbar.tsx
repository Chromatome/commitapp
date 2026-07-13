import React from 'react';
import { Link, useNavigate } from 'react-router';
import '../styles/styles.css';
import logo from "../assets/commitsticker.png";
import { logOut } from '../lib/auth';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside or pressing Escape.
  React.useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const handleLogOut = async () => {
    setMenuOpen(false);
    await logOut();
    navigate('/');
  };

  return (
    <header className="navbar">
      <a className="n-logo" href="/" aria-label="CommIt home">
        <img 
          src={logo} 
          alt="CommIt logo" 
          className="n-logo-img"
      />
      </a>

      <div className="n-header-right">
        <div className="n-credits">Credits: 0</div>

        <button
          type="button"
          className="n-buy-credits"
          onClick={() => navigate('/purchase')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Buy Credits
        </button>

        <div className="n-menu" ref={menuRef}>
          <button
            type="button"
            className="n-menu-btn"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="n-menu-avatar" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
              </svg>
            </span>
            <span className="n-menu-caret" aria-hidden="true">▾</span>
            <span className="sr-only">Account menu</span>
          </button>

          {menuOpen && (
            <nav className="n-dropdown" role="menu" aria-label="Account">
              <Link
                to="/profile"
                className="n-dropdown-item"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                Profile
              </Link>
              <Link
                to="/settings"
                className="n-dropdown-item"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                Settings
              </Link>
              <div className="n-dropdown-divider" role="separator" />
              <button
                type="button"
                className="n-dropdown-item n-dropdown-logout"
                role="menuitem"
                onClick={handleLogOut}
              >
                Log Out
              </button>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
