import React from 'react';
import '../styles/styles.css';
import logo from "../assets/logo.png";

const Navbar: React.FC = () => {
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
      </div>
    </header>
  );
};

export default Navbar;