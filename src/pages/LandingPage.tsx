import '../styles/landingpage.css';
import React from 'react';
import { Navigate, useNavigate } from 'react-router';
// import logo from "../assets/logo.png";
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useSession } from '../hooks/useSession';
import LinkButton from '../components/LinkButton';
import example_art from "../assets/example_art.png";
import "../styles/styles.css";
import Background from '../components/Background';
import Button from '../components/Button';
import CurvedLoop from '../components/CurvedLoop';
import logo2 from "../assets/commitsticker.png";
import "../styles/styles.css";
import { logInAsDemoUser } from '../lib/auth';

gsap.registerPlugin(ScrollTrigger);

const LandingPage: React.FC = () => {
  const aboutRef = React.useRef<HTMLDivElement>(null);
  const pageRef = React.useRef<HTMLDivElement>(null);
  const { session, checking } = useSession();
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = React.useState(false);
  const [demoError, setDemoError] = React.useState<string | null>(null);

  // Showcase-only: "Get Started" signs the visitor straight in as a demo
  // account instead of sending them through signup. See src/lib/auth.ts
  // (logInAsDemoUser) — requires VITE_DEMO_USER_EMAIL / VITE_DEMO_USER_PASSWORD
  // to be set in the environment.
  const handleGetStarted = async () => {
    if (demoLoading) return;
    setDemoError(null);
    setDemoLoading(true);
    try {
      const { error } = await logInAsDemoUser();
      if (error) {
        setDemoError(error);
        return;
      }
      navigate('/marketplace');
    } finally {
      setDemoLoading(false);
    }
  };

  const toAboutSection = () => {
    if (aboutRef.current) {
      aboutRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }

  React.useEffect(() => {
    if (!pageRef.current) return;

    const ctx = gsap.context(() => {
      // Fade-and-rise reveals for each block in the features section
      gsap.utils.toArray<HTMLElement>('.reveal-up').forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 60 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%' }
          }
        );
      });

      // Staggered pop-in for the feature cards
      gsap.fromTo(
        '.fs-feature-card',
        { opacity: 0, y: 48, scale: 0.94 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          ease: 'back.out(1.6)',
          stagger: 0.15,
          scrollTrigger: { trigger: '.fs-feature-cards', start: 'top 85%' }
        }
      );

      // Quote card swings in from a tilt
      gsap.fromTo(
        '.fs-quote',
        { opacity: 0, rotateZ: -6, y: 50 },
        {
          opacity: 1,
          rotateZ: -2,
          y: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.fs-quotes', start: 'top 85%' }
        }
      );

      // Sticker logo spins upright as the header scrolls into view
      gsap.fromTo(
        '.fs-header span img',
        { rotateZ: -30, scale: 0.6 },
        {
          rotateZ: -6,
          scale: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: '.fs-header',
            start: 'top bottom',
            end: 'top 40%',
            scrub: true
          }
        }
      );
    }, pageRef);

    return () => ctx.revert();
  }, [checking, session]);

  // Logged-in users skip the landing page and go straight to the marketplace.
  if (checking) return null;
  if (session) return <Navigate to="/marketplace" replace />;

  return (
    <div className="landing-page" ref={pageRef}>
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
            <Button
              label={demoLoading ? 'Loading…' : 'Get Started'}
              onClick={handleGetStarted}
              disabled={demoLoading}
              isPrimary
              color="#ffc6ff"
            />
            <Button label="Learn More" onClick={toAboutSection} color="var(--gray-bg) " />
          </div>
          {demoError && <p className="cta-error" role="alert">{demoError}</p>}
        </section>

        {/* Scrolling marquee divider */}
        <div className="landing-marquee">
          <CurvedLoop
            marqueeText={'Commission \u2605 Connect \u2605 Create \u2605 '}
            speed={1.5}
            curveAmount={80}
            className="landing-marquee-text"
          />
        </div>

        {/* Description & Features Section */}
        <section className="features-section">
          <div className="fs-header reveal-up" ref={aboutRef}>
              <span><img src={logo2} alt="CommIt Logo" /></span> 
                is a secure platform for artists and art enthusiasts to connect, collaborate, and transact safely.
          </div>

          <div className="fs-subheader reveal-up">
            No more payment disputes, fake buyers, or AI art. Built for the social media art community, CommIt handles the security so artists and art lovers can safely connect, collaborate, and grow together.
          </div>

          <div className="fs-quotes">
            <div className="fs-quote">
              <div><i>“I find it difficult to find people who are willing to commission artists as a smaller artist as people will complain about prices or simply not get commission from you.”</i></div>
              <div>Elena Gomez, Digital artist</div>
            </div>
          </div>

          <div className="fs-features reveal-up">
            <div className="fs-feature-cards">
              <div className="fs-feature-card" style={{ '--card-color': 'var(--green)' } as React.CSSProperties}>
                <div className="fs-feature-card-title">Reputation System</div>
                <div className="fs-feature-card-body">Build trust with every completed commission. No more fake buyers or flaky commissioners.</div>
              </div>
              <div className="fs-feature-card" style={{ '--card-color': 'var(--blue)' } as React.CSSProperties}>
                <div className="fs-feature-card-title">AI Generated Artist Description</div>
                <div className="fs-feature-card-body">Let your portfolio speak for itself with an auto-written artist bio that highlights your style.</div>
              </div>
              <div className="fs-feature-card" style={{ '--card-color': 'var(--pink)' } as React.CSSProperties}>
                <div className="fs-feature-card-title">Easy, Customizable Listings</div>
                <div className="fs-feature-card-body">Set your prices, tiers, and terms in minutes. Your commissions, your rules.</div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default LandingPage;
