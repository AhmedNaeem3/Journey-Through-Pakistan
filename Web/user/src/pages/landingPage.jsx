import React, { useEffect, useRef } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FaMapMarkerAlt, 
  FaCamera, 
  FaUsers, 
  FaHeart, 
  FaRocket,
  FaChevronDown,
  FaStar,
  FaGlobe,
  FaMobileAlt,
  FaComments
} from 'react-icons/fa';
import Particles from 'react-tsparticles';

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const heroRef = useRef(null);
  const featuresRef = useRef(null);
  const statsRef = useRef(null);
  
  const heroInView = useInView(heroRef, { once: true, amount: 0.3 });
  const featuresInView = useInView(featuresRef, { once: true, amount: 0.2 });
  const statsInView = useInView(statsRef, { once: true, amount: 0.3 });

  const heroControls = useAnimation();
  const featuresControls = useAnimation();
  const statsControls = useAnimation();

  useEffect(() => {
    if (heroInView) heroControls.start('visible');
    if (featuresInView) featuresControls.start('visible');
    if (statsInView) statsControls.start('visible');
  }, [heroInView, featuresInView, statsInView, heroControls, featuresControls, statsControls]);

  const particlesInit = async (main) => {
    // Particles will initialize automatically
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };

  const features = [
    {
      icon: FaMapMarkerAlt,
      title: 'Discover Landmarks',
      description: 'Explore beautiful landmarks across Pakistan with detailed information and stunning visuals.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: FaCamera,
      title: 'AI-Powered Recognition',
      description: 'Identify landmarks instantly using advanced AI technology. Just point and discover!',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: FaUsers,
      title: 'Community Hub',
      description: 'Connect with fellow travelers, share experiences, and build your travel community.',
      color: 'from-orange-500 to-red-500',
    },
    {
      icon: FaHeart,
      title: 'Personalized Trips',
      description: 'Get AI-powered recommendations tailored to your preferences and travel style.',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: FaComments,
      title: 'Real-time Chat',
      description: 'Chat with other travelers, share tips, and plan your next adventure together.',
      color: 'from-indigo-500 to-blue-500',
    },
    {
      icon: FaMobileAlt,
      title: 'Mobile Friendly',
      description: 'Access all features on the go with our responsive mobile and web applications.',
      color: 'from-pink-500 to-rose-500',
    },
  ];

  const stats = [
    { number: '10K+', label: 'Active Users', icon: FaUsers },
    { number: '500+', label: 'Landmarks', icon: FaMapMarkerAlt },
    { number: '50K+', label: 'Photos Shared', icon: FaCamera },
    { number: '100+', label: 'Cities Covered', icon: FaGlobe },
  ];

  return (
    <div className="landing-page" style={{ overflowX: 'hidden' }}>
      {/* Particles Background */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          fpsLimit: 120,
          interactivity: {
            events: {
              onHover: {
                enable: true,
                mode: 'repulse',
              },
              resize: true,
            },
            modes: {
              repulse: {
                distance: 100,
                duration: 0.4,
              },
            },
          },
          particles: {
            color: {
              value: ['#E65100', '#FF6F00', '#FF8F00', '#FFA000'],
            },
            links: {
              color: '#E65100',
              distance: 150,
              enable: true,
              opacity: 0.2,
              width: 1,
            },
            move: {
              direction: 'none',
              enable: true,
              outModes: {
                default: 'bounce',
              },
              random: false,
              speed: 1,
              straight: false,
            },
            number: {
              density: {
                enable: true,
                area: 800,
              },
              value: 50,
            },
            opacity: {
              value: 0.3,
            },
            shape: {
              type: 'circle',
            },
            size: {
              value: { min: 1, max: 3 },
            },
          },
          detectRetina: true,
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
        }}
      />

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="hero-section"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 15s ease infinite',
        }}
      >
        <style>{`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>

        <motion.div
          className="container text-center text-white"
          style={{ position: 'relative', zIndex: 1 }}
          variants={containerVariants}
          initial="hidden"
          animate={heroControls}
        >
          <motion.div variants={itemVariants}>
            <motion.h1
              className="display-3 fw-bold mb-4"
              style={{
                fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                textShadow: '2px 2px 8px rgba(0,0,0,0.3)',
                background: 'linear-gradient(45deg, #fff, #f0f0f0)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Journey Through Pakistan
            </motion.h1>
          </motion.div>

          <motion.div variants={itemVariants}>
            <motion.p
              className="lead mb-5"
              style={{
                fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
                textShadow: '1px 1px 4px rgba(0,0,0,0.2)',
                maxWidth: '800px',
                margin: '0 auto',
              }}
            >
              Discover the beauty of Pakistan with AI-powered landmark recognition, 
              personalized travel recommendations, and an amazing community of explorers.
            </motion.p>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="d-flex flex-wrap justify-content-center gap-3 mb-5"
          >
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (isAuthenticated) {
                  navigate('/dashboard');
                } else {
                  navigate('/signup');
                }
              }}
              className="btn btn-light btn-lg px-5 py-3 rounded-pill fw-bold"
              style={{
                fontSize: '1.1rem',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                border: 'none',
              }}
            >
              <FaRocket className="me-2" />
              Get Started Free
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (isAuthenticated) {
                  navigate('/dashboard');
                } else {
                  navigate('/login');
                }
              }}
              className="btn btn-outline-light btn-lg px-5 py-3 rounded-pill fw-bold"
              style={{
                fontSize: '1.1rem',
                borderWidth: '2px',
                backdropFilter: 'blur(10px)',
              }}
            >
              Sign In
            </motion.button>
          </motion.div>

          <motion.div variants={itemVariants}>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ marginTop: '3rem', cursor: 'pointer' }}
              onClick={() => {
                document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <FaChevronDown size={30} style={{ opacity: 0.8 }} />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        ref={featuresRef}
        className="py-5"
        style={{
          background: 'linear-gradient(to bottom, #f8f9fa, #ffffff)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div className="container py-5">
          <motion.div
            className="text-center mb-5"
            variants={itemVariants}
            initial="hidden"
            animate={featuresControls}
          >
            <motion.h2
              className="display-4 fw-bold mb-3"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Amazing Features
            </motion.h2>
            <p className="lead text-muted">Everything you need for an unforgettable journey</p>
          </motion.div>

          <motion.div
            className="row g-4"
            variants={containerVariants}
            initial="hidden"
            animate={featuresControls}
          >
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              const renderIcon = () => {
                switch(index) {
                  case 0: return <FaMapMarkerAlt size={48} color="#ffffff" />;
                  case 1: return <FaCamera size={48} color="#ffffff" />;
                  case 2: return <FaUsers size={48} color="#ffffff" />;
                  case 3: return <FaHeart size={48} color="#ffffff" />;
                  case 4: return <FaComments size={48} color="#ffffff" />;
                  case 5: return <FaMobileAlt size={48} color="#ffffff" />;
                  default: return IconComponent ? <IconComponent size={48} color="#ffffff" /> : null;
                }
              };
              
              return (
                <motion.div
                  key={index}
                  className="col-md-6 col-lg-4"
                  variants={itemVariants}
                >
                  <motion.div
                    whileHover={{ y: -10, scale: 1.02 }}
                    className="card h-100 border-0 shadow-lg"
                    style={{
                      borderRadius: '20px',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <div
                      style={{
                        height: '120px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: `linear-gradient(135deg, ${
                          feature.color === 'from-blue-500 to-cyan-500' ? '#3b82f6, #06b6d4' :
                          feature.color === 'from-purple-500 to-pink-500' ? '#a855f7, #ec4899' :
                          feature.color === 'from-orange-500 to-red-500' ? '#f97316, #ef4444' :
                          feature.color === 'from-green-500 to-emerald-500' ? '#22c55e, #10b981' :
                          feature.color === 'from-indigo-500 to-blue-500' ? '#6366f1, #3b82f6' :
                          '#ec4899, #f43f5e'
                        })`,
                        position: 'relative',
                      }}
                    >
                      {renderIcon()}
                    </div>
                    <div className="card-body p-4">
                      <h4 className="card-title fw-bold mb-3">{feature.title}</h4>
                      <p className="card-text text-muted">{feature.description}</p>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section
        ref={statsRef}
        className="py-5"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div className="container py-5">
          <motion.div
            className="row g-4 text-center text-white"
            variants={containerVariants}
            initial="hidden"
            animate={statsControls}
          >
            {stats.map((stat, index) => {
              const renderStatIcon = () => {
                switch(index) {
                  case 0: return <FaUsers size={48} color="#ffffff" />;
                  case 1: return <FaMapMarkerAlt size={48} color="#ffffff" />;
                  case 2: return <FaCamera size={48} color="#ffffff" />;
                  case 3: return <FaGlobe size={48} color="#ffffff" />;
                  default: return null;
                }
              };
              
              return (
                <motion.div
                  key={index}
                  className="col-6 col-md-3"
                  variants={itemVariants}
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="p-4"
                  >
                    <div className="mb-3" style={{ opacity: 0.9, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {renderStatIcon()}
                    </div>
                    <motion.h3
                      className="display-4 fw-bold mb-2"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={statsControls}
                      transition={{ delay: index * 0.2, type: 'spring', stiffness: 200 }}
                      style={{ color: '#ffffff' }}
                    >
                      {stat.number}
                    </motion.h3>
                    <p className="lead mb-0" style={{ color: '#ffffff', opacity: 0.95 }}>{stat.label}</p>
                  </motion.div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="py-5"
        style={{
          background: 'linear-gradient(to bottom, #ffffff, #f8f9fa)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div className="container py-5">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <motion.h2
              className="display-4 fw-bold mb-4"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Ready to Start Your Journey?
            </motion.h2>
            <p className="lead text-muted mb-5">
              Join thousands of travelers exploring Pakistan's hidden gems
            </p>
            <motion.button
              whileHover={{ scale: 1.1, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (isAuthenticated) {
                  navigate('/dashboard');
                } else {
                  navigate('/signup');
                }
              }}
              className="btn btn-lg px-5 py-3 rounded-pill fw-bold text-white"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
                fontSize: '1.2rem',
              }}
            >
              <FaRocket className="me-2" />
              Get Started Now
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-4 text-center"
        style={{
          background: '#1a1a2e',
          color: '#fff',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div className="container">
          <p className="mb-0">
            © {new Date().getFullYear()} Journey Through Pakistan. Made with{' '}
            <span style={{ color: '#ff6b6b' }}>❤️</span> for travelers.
          </p>
        </div>
      </footer>

      <style>{`
        .landing-page {
          font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .bg-gradient {
          background: linear-gradient(135deg, var(--gradient));
        }
        .card {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .card:hover {
          box-shadow: 0 20px 40px rgba(0,0,0,0.15) !important;
        }
        @media (max-width: 768px) {
          .hero-section {
            padding: 2rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}
