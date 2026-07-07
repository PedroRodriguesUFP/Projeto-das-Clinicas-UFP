import React from 'react';
import { motion } from 'framer-motion';
import '../styles/hero.css';

// Icon component for contact details
const InfoIcon = ({ type }) => {
  const icons = {
    website: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="info-icon" style={{ color: 'var(--ufp-primary)' }}>
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" x2="22" y1="12" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    ),
    phone: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="info-icon" style={{ color: 'var(--ufp-primary)' }}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
      </svg>
    ),
    address: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="info-icon" style={{ color: 'var(--ufp-primary)' }}>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    ),
  };
  return <div className="info-icon-wrapper">{icons[type]}</div>;
};

const HeroSection = React.forwardRef(({ logo, slogan, title, subtitle, callToAction, backgroundImage, contactInfo }, ref) => {
  // Animation variants for the container to orchestrate children animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  // Animation variants for individual text/UI elements
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <motion.section
      ref={ref}
      className="hero-section-animated"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Left Side: Content */}
      <div className="hero-section-content">
        {/* Top Section: Logo & Main Content */}
        <div>
          <motion.header className="hero-header" variants={itemVariants}>
            {logo && (
              <div className="hero-logo">
                <img src={logo.url} alt={logo.alt} className="logo-img" />
                <div>
                  {logo.text && <p className="logo-text">{logo.text}</p>}
                  {slogan && <p className="logo-slogan">{slogan}</p>}
                </div>
              </div>
            )}
          </motion.header>

          <motion.main className="hero-main" variants={containerVariants}>
            <motion.h1 className="hero-title" variants={itemVariants}>
              {title}
            </motion.h1>
            <motion.div className="hero-divider" variants={itemVariants}></motion.div>
            <motion.p className="hero-subtitle" variants={itemVariants}>
              {subtitle}
            </motion.p>
            {callToAction && (
              <motion.a href={callToAction.href} className="hero-cta" variants={itemVariants}>
                {callToAction.text}
              </motion.a>
            )}
          </motion.main>
        </div>

        {/* Bottom Section: Footer Info */}
        {contactInfo && (
          <motion.footer className="hero-footer" variants={itemVariants}>
            <div className="contact-grid">
              <div className="contact-item">
                <InfoIcon type="website" />
                <a href="https://ess.fernandopessoa.pt/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                  {contactInfo.website}
                </a>
              </div>
              <div className="contact-item">
                <InfoIcon type="phone" />
                <span>{contactInfo.phone}</span>
              </div>
              <div className="contact-item">
                <InfoIcon type="address" />
                <a href="https://www.google.com/maps/place/Escola+Superior+de+Sa%C3%BAde+Fernando+Pessoa/@41.1729392,-8.6110556,18.17z/data=!4m14!1m7!3m6!1s0xd24644e96bfbb8d:0x1b56312fb4975696!2sUniversidade+Fernando+Pessoa!8m2!3d41.1728847!4d-8.6111563!16s%2Fm%2F02z11pb!3m5!1s0xd246592f310e125:0xd30720c344524d36!8m2!3d41.173248!4d-8.6097179!16s%2Fg%2F11smrcgq9b?entry=ttu&g_ep=EgoyMDI2MDUxMy4wIKXMDSoASAFQAw%3D%3D" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                  {contactInfo.address}
                </a>
              </div>
            </div>
          </motion.footer>
        )}
      </div>

      {/* Right Side: Image with Clip Path Animation */}
      <motion.div
        className="hero-image"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
        initial={{ clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' }}
        animate={{ clipPath: 'polygon(25% 0, 100% 0, 100% 100%, 0% 100%)' }}
        transition={{ duration: 1.2, ease: "circOut" }}
      ></motion.div>
    </motion.section>
  );
});

HeroSection.displayName = "HeroSection";

export { HeroSection };
