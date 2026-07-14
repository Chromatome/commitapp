import '../styles/landingpage.css';
import React from 'react';
import { Navigate } from 'react-router';
// import logo from "../assets/logo.png";
import { useSession } from '../hooks/useSession';
import LinkButton from '../components/LinkButton';
import example_art from "../assets/example_art.png";
import "../styles/styles.css";
import Background from '../components/Background';
import Button from '../components/Button';
import logo2 from "../assets/commitsticker.png";
import "../styles/styles.css";


const LandingPage: React.FC = () => {
  const aboutRef = React.useRef<HTMLDivElement>(null);
  const { session, checking } = useSession();

  const toAboutSection = () => {
    if (aboutRef.current) {
      aboutRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Logged-in users skip the landing page and go straight to the marketplace.
  if (checking) return null;
  if (session) return <Navigate to="/marketplace" replace />;

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
                <img src={logo2} alt="CommIt Logo" />
              </div>
              for artists <br />and art enthusiasts
            </div>

            <div className="hero-branding">
              <img src={example_art} alt="Example Art" id="example-art"/>
            </div>
          </div>

          {/* CTA Button */}
          <div className="cta-buttons">
            <LinkButton label="Get Started" href="/login?mode=signup" isPrimary color="#ffc6ff"/>
            <Button label="Learn More" onClick={toAboutSection} color="var(--gray-bg) " />
          </div>
        </section>

        {/* Description & Features Section */}
        <section className="features-section">
          <div className="fs-header" ref={aboutRef}>
              <span><img src={logo2} alt="CommIt Logo" /></span> 
                is a secure platform for artists and art enthusiasts to connect, collaborate, and transact safely.
          </div>

          <div className="fs-subheader">
            No more payment disputes, fake buyers, or AI art. Built for the social media art community, CommIt handles the security so artists and art lovers can safely connect, collaborate, and grow together.
          </div>

          <div className="fs-quotes">
            <div>“I find it difficult to find people who are willing to commission artists as a smaller artist as people will complain about prices or simply not get commission from you.” </div>
            <div>Elena Gomez, Digital artist</div>
          </div>

          <div className="fs-features">
            <h2>Features</h2>
            <div>
              <ul>
                <li>Reputation System</li>
                <li>AI Generated Artist Description</li>
                <li>Easy, customizable listings</ li>
              </ul>
            </div>
          
          
          </div>
        </section>

      </main>
    </div>
  );
};

export default LandingPage;
