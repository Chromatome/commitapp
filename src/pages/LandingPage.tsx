import '../styles/landingpage.css';
import React from 'react';
// import logo from "../assets/logo.png";
import LinkButton from '../components/LinkButton';
import example_art from "../assets/example_art.png";
import "../styles/styles.css";
import Background from '../components/Background';
import Button from '../components/Button';

const LandingPage: React.FC = () => {
  const aboutRef = React.useRef<HTMLDivElement>(null);

  const toAboutSection = () => {
    if (aboutRef.current) {
      aboutRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
    <div className="landing-page">
      <Background 
      direction='diagonal' 
      speed={0.3}
      borderColor="rgba(0, 0, 0, 0.05)"
      />
      

      {/* Main Content */}
      <main>

        <header className="navbar">
          <LinkButton label="Log In" href="/login" color="var(--green)" />
        </header>
        
        {/* Hero Section */}
        <section className="hero-section">
          
          <div className="hero-content">
            <div className="hero-slogan">
              <div className="hero-logo">
                CommIt
              </div>
              for artists <br />and art enthusiasts
            </div>

            <div className="hero-branding">
              <img src={example_art} alt="Example Art" id="example-art"/>
            </div>
          </div>

          {/* CTA Button */}
          <div className="cta-buttons">
            <LinkButton label="Get Started" href="/marketplace" isPrimary color="#ffc6ff"/>
            <Button label="Learn More" onClick={toAboutSection} color="var(--gray-bg) " />
          </div>
        </section>

        {/* Description & Features Section */}
        <section className="features-section">
          <div className="fs-content" ref={aboutRef}>
            <h2>About Our Platform</h2>
            <p className="features-description">
              Welcome to the ultimate solution for your productivity needs. Our platform is designed 
              to streamline your daily tasks, providing you with the tools necessary to scale your 
              business effortlessly. Whether you are a solo entrepreneur or a large enterprise, 
              we have everything you need to succeed.
            </p>
          
          
          </div>
        </section>

      </main>
    </div>
  );
};

export default LandingPage;
