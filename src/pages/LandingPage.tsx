import '../styles/landingpage.css';
import Navbar from '../components/Navbar.tsx';

const LandingPage: React.FC = () => {
  return (
    <div className="landing-page">
      <Navbar />

      {/* Main Content */}
      <main>
        
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <img 
              src="https://via.placeholder.com/250x250?text=Hero+Image" 
              alt="Hero Placeholder" 
              className="hero-logo"
            />
            
            <h1 className="hero-slogan">
              Mutual satisfaction between artists and clients, through <span>CommIt</span>.
            </h1>
          </div>
          <button className="btn-primary" style={{ fontSize: '1.2rem', padding: '1rem 3rem' }}>
            Get Started
          </button>
        </section>

        {/* Description & Features Section */}
        <section className="features-section">
          <h2>About Our Platform</h2>
          <p className="features-description">
            Welcome to the ultimate solution for your productivity needs. Our platform is designed 
            to streamline your daily tasks, providing you with the tools necessary to scale your 
            business effortlessly. Whether you are a solo entrepreneur or a large enterprise, 
            we have everything you need to succeed.
          </p>
          
          <h3>Key Features</h3>
          <ul className="features-list">
            <li><strong>Lightning Fast Performance:</strong> Built with the latest tech stack for zero latency.</li>
            <li><strong>Secure by Default:</strong> Enterprise-grade encryption to keep your data safe.</li>
            <li><strong>24/7 Support:</strong> Our dedicated team is always here to help you navigate issues.</li>
            <li><strong>Seamless Integrations:</strong> Connect your favorite tools with just a few clicks.</li>
          </ul>
        </section>

      </main>
    </div>
  );
};

export default LandingPage;
