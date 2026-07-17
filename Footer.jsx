import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import '../styles/footer.css';

export function Footer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const links = [
    { title: t('footer.specialties'), href: '#especialidades' },
    { title: t('footer.contacts'), href: '#contactos' },
  ];

  const handleNavigation = (href) => {
    if (href.startsWith('/')) {
      navigate(href);
    } else if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className="footer-section">
      <div className="container">
        {/* Links Grid */}
        <div className="footer-links-grid">
          {links.map((link, index) => (
            <a
              key={index}
              href={link.href}
              className="footer-link"
              onClick={(e) => {
                if (link.href.startsWith('/') || link.href.startsWith('#')) {
                  e.preventDefault();
                  handleNavigation(link.href);
                }
              }}>
              <span>{link.title}</span>
            </a>
          ))}
        </div>

        {/* Social Icons */}
        <div className="footer-social-section">
          <div className="social-icons-footer">
            <a
              href="https://ess.fernandopessoa.pt/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('footer.website')}
              className="social-icon-footer">
              <svg
                className="icon-size"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"></circle>
                <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="1.5"></path>
                <path d="M6 5c0 0 0 14 6 14s6-14 6-14" stroke="currentColor" strokeWidth="1.5" fill="none"></path>
                <path d="M6 19c0 0 0-14 6-14s6 14 6 14" stroke="currentColor" strokeWidth="1.5" fill="none"></path>
                <ellipse cx="12" cy="12" rx="10" ry="3.5" fill="none" stroke="currentColor" strokeWidth="1.5"></ellipse>
              </svg>
            </a>
            <a
              href="https://www.facebook.com/a.fernando.pessoa"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('footer.facebook')}
              className="social-icon-footer">
              <svg
                className="icon-size"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95"></path>
              </svg>
            </a>
            <a
              href="https://www.instagram.com/a.fernando.pessoa/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('footer.instagram')}
              className="social-icon-footer">
              <svg
                className="icon-size"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4zm9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8A1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5a5 5 0 0 1-5 5a5 5 0 0 1-5-5a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3"></path>
              </svg>
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} UAAPS. {t('footer.rightsReserved')}</p>
        </div>
      </div>
    </footer>
  );
}
