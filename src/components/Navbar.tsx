import React from 'react';
import '../styles/styles.css';

const Navbar: React.FC = () => {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <img 
          src="https://via.placeholder.com/150x40?text=Your+Logo" 
          alt="Company Logo" 
          className="navbar-logo" 
        />
      </div>
      <div className="navbar-right">
        <button className="btn-primary">Sign Up</button>
      </div>
    </nav>
  );
};

export default Navbar;