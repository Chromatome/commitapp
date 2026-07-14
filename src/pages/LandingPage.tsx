import '../styles/styles.css';
import '../styles/landingpage.css';
import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useSession } from '../hooks/useSession';
import LinkButton from '../components/LinkButton';
import Button from '../components/Button';
import Background from '../components/Background';
import example_art from '../assets/example_art.png';
import logo2 from '../assets/commitsticker.png';

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    title: 'Reputation System',
    text: 'Build trust with every completed commission. Real reviews, real people.',
    color: 'var(--green)',
  },
  {
    title: 'AI-Generated Artist Description',
    text: 'Let us write your bio so you can get back to your canvas.',
    color: 'var(--blue)',
  },
  {
    title: 'Easy, Customizable Listings',
    text: 'Set your prices, styles, and terms — your art, your rules.',
    color: 'var(--pink)',
  },
];

const LandingPage: React.FC = () => {
  const pageRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const { session, checking } = useSession();

  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      // --- Hero entry timeline ---
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        '.hero-logo img',
        { scale: 0.4, rotate: -18, opacity: 0 },
        { scale: 1, rotate: -4, opacity: 1, duration: 0.9, ease: 'back.out(1.8)' }
      )
        .fromTo(
          '.hero-line-inner',
          { yPercent: 110 },
          { yPercent: 0, duration: 0.8, stagger: 0.12 },
          '-=0.5'
        )
        .fromTo(
          '.hero-branding',
          { x: 40, opacity: 0, rotate: 4 },
          { x: 0, opacity: 1, rotate: 0, duration: 0.8 },
          '-=0.55'
        )
        .fromTo(
          '.cta-buttons .btn-wrapper',
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.1 },
          '-=0.4'
        )
        .fromTo(
          '.navbar .btn-wrapper',
          { y: -16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5 },
          '-=0.6'
        );

      // --- Scroll-triggered reveals ---
      gsap.utils.toArray<HTMLElement>('.reveal').forEach(item => {
        gsap.fromTo(
          item,
          { y: 48, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: item,
              start: 'top bottom-=60',
              toggleActions: 'play none none none',
            },
          }
        );
      });

      gsap.utils.toArray<HTMLElement>('.feature-card').forEach((card, i) => {
        gsap.fromTo(
          card,
          { y: 40, opacity: 0, rotate: i % 2 === 0 ? -2 : 2 },
          {
            y: 0,
            opacity: 1,
            rotate: 0,
            duration: 0.7,
            delay: i * 0.12,
            ease: 'back.out(1.4)',
            scrollTrigger: {
              trigger: '.fs-features',
              start: 'top 80%',
              toggleActions: 'play none none none',
            },
          }
        );
      });

      gsap.fromTo(
        '.fs-image-frame',
        { y: 60, opacity: 0, rotate: 3 },
        {
          y: 0,
          opacity: 1,
          rotate: -2,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.fs-features',
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      );
    }, el);

    // Re-measure trigger positions once images/fonts finish loading.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);

    return () => {
      window.removeEventListener('load', refresh);
      ctx.revert();
    };
  }, [checking, session]);

  const toAboutSection = () => {
    aboutRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Logged-in users skip the landing page and go straight to the marketplace.
  if (checking) return null;
  if (session) return <Navigate to="/marketplace" replace />;

  return (
    <div className="landing-page" ref={pageRef}>
      <Background direction="diagonal" speed={0.3} borderColor="rgba(0, 0, 0, 0.05)" />

      <main>
        <header className="navbar">
          <LinkButton label="Log In" href="/login" color="var(--green)" />
        </header>

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <h1 className="hero-slogan">
              <span className="hero-logo">
                <img src={logo2} alt="CommIt" />
              </span>
              <span className="hero-line">
                <span className="hero-line-inner">for artists</span>
              </span>
              <span className="hero-line">
                <span className="hero-line-inner">
                  and art <em>enthusiasts</em>
                </span>
              </span>
            </h1>

            <div className="hero-branding">
              <div className="hero-art-frame">
                <img src={example_art} alt="Example commissioned artwork" id="example-art" />
                <span className="hero-art-tag">commissioned art</span>
              </div>
            </div>
          </div>

          <div className="cta-buttons">
            <LinkButton label="Get Started" href="/login?mode=signup" isPrimary color="#ffc6ff" />
            <Button label="Learn More" onClick={toAboutSection} color="var(--gray-bg)" />
          </div>
        </section>

        {/* Description & Features Section */}
        <section className="features-section">
          <div className="fs-header reveal" ref={aboutRef}>
            <span className="fs-header-logo">
              <img src={logo2} alt="CommIt" />
            </span>
            is a secure platform for artists and art enthusiasts to connect, collaborate, and
            transact safely.
          </div>

          <p className="fs-subheader reveal">
            No more payment disputes, fake buyers, or AI art. Built for the social media art
            community, CommIt handles the security so artists and art lovers can safely connect,
            collaborate, and grow together.
          </p>

          <figure className="fs-quotes reveal">
            <blockquote>
              {'\u201C'}I find it difficult to find people who are willing to commission artists as
              a smaller artist, as people will complain about prices or simply not get commissions
              from you.{'\u201D'}
            </blockquote>
            <figcaption>Elena Gomez, Digital Artist</figcaption>
          </figure>

          <div className="fs-features">
            <div className="fs-features-copy">
              <h2 className="reveal">Features</h2>
              <div className="fs-feature-list">
                {FEATURES.map(feature => (
                  <article
                    className="feature-card"
                    key={feature.title}
                    style={{ '--card-accent': feature.color } as React.CSSProperties}
                  >
                    <h3>{feature.title}</h3>
                    <p>{feature.text}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="fs-image-frame">
              <img
                src="/feature-placeholder.svg"
                alt="Placeholder for a featured artwork"
                className="fs-image"
              />
              <span className="fs-image-tag">your art here</span>
            </div>
          </div>

          <div className="fs-cta reveal">
            <p>Ready to commit to your craft?</p>
            <LinkButton label="Join CommIt" href="/login?mode=signup" isPrimary color="var(--purple)" />
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
