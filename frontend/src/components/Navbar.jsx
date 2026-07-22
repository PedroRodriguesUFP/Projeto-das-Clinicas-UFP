import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { CalendarDate, PlusLg, ArrowLeftRight } from 'react-bootstrap-icons';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import '../styles/navbar.css';

export function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [consultasDropdownOpen, setConsultasDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const { t } = useTranslation();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-brand">
          <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
            <img src="/images/ufp-logo.png" alt="Logo Clínica" className="navbar-logo-img" />
            <span className="navbar-logo-text">UAAPS</span>
          </a>
        </div>

        {/* Hamburger Button */}
        <button
          className="navbar-hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Abrir menu"
        >
          <span className={`hamburger-line ${mobileMenuOpen ? 'active' : ''}`}></span>
          <span className={`hamburger-line ${mobileMenuOpen ? 'active' : ''}`}></span>
          <span className={`hamburger-line ${mobileMenuOpen ? 'active' : ''}`}></span>
        </button>

        {/* Menu + User (Desktop) */}
        {user && (
          <div className="navbar-menu">
            {user?.role !== 'terapeuta' && (
              <button onClick={() => navigate('/')} className="navbar-link">
                {t('nav.home')}
              </button>
            )}

            <button onClick={() => navigate('/dashboard')} className="navbar-link">
              {t('nav.dashboard')}
            </button>

            <div className="navbar-dropdown">
              <button
                className="navbar-link dropdown-toggle"
                onClick={() => setConsultasDropdownOpen(!consultasDropdownOpen)}
                onBlur={() => setTimeout(() => setConsultasDropdownOpen(false), 200)}
              >
                {t('nav.consultations')}
                <svg className="dropdown-arrow" width="10" height="6" viewBox="0 0 10 6">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </button>

              {consultasDropdownOpen && (
                <div className="dropdown-menu">
                  <a href="/consultas" className="dropdown-item" onClick={(e) => {
                    e.preventDefault();
                    navigate('/consultas');
                    setConsultasDropdownOpen(false);
                  }}>
                    {t('nav.viewConsultations')}
                  </a>
                  <a href="/calendario" className="dropdown-item" onClick={(e) => {
                    e.preventDefault();
                    navigate('/calendario');
                    setConsultasDropdownOpen(false);
                  }}>
                    <CalendarDate size={14} /> {t('nav.calendar')}
                  </a>
                  {(user?.role === 'utente' || user?.role === 'administrativo') && (
                    <a href="/consultas/nova" className="dropdown-item" onClick={(e) => {
                      e.preventDefault();
                      navigate('/consultas/nova');
                      setConsultasDropdownOpen(false);
                    }}>
                        <PlusLg size={14} /> {t('nav.bookAppointment')}
                    </a>
                  )}
                </div>
              )}
            </div>

            {(user?.role === 'admin' || user?.role === 'administrativo') && (
              <button onClick={() => navigate('/utentes/transferir')} className="navbar-link">
                <ArrowLeftRight size={14} /> {t('nav.transferPatients')}
              </button>
            )}
          </div>
        )}

        {/* User Area Desktop */}
        <div className="navbar-user">
          {user ? (
            <div className="navbar-dropdown user-dropdown">
              <button
                className="navbar-link user-trigger"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                onBlur={() => setTimeout(() => setUserDropdownOpen(false), 200)}
              >
                <span className="user-avatar">{user.name?.charAt(0).toUpperCase() || 'U'}</span>
                <span className="user-name">{user?.name || t('nav.user')}</span>
                <svg className="dropdown-arrow" width="10" height="6" viewBox="0 0 10 6">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </button>

              {userDropdownOpen && (
                <div className="dropdown-menu user-menu">
                  <a href="/perfil" className="dropdown-item" onClick={(e) => {
                    e.preventDefault();
                    navigate('/user');
                    setUserDropdownOpen(false);
                  }}>
                    {t('nav.profile')}
                  </a>
                  <button className="dropdown-item logout-item" onClick={() => {
                    handleLogout();
                    setUserDropdownOpen(false);
                  }}>
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => navigate('/login')} className="navbar-login-btn">
              {t('nav.signIn')}
            </button>
          )}
          <LanguageSwitcher className="navbar-language-switcher" />
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="navbar-mobile-menu">
          {user && (
            <>
              {user?.role !== 'terapeuta' && (
                <button onClick={() => { navigate('/'); setMobileMenuOpen(false); }} className="mobile-menu-link">
                  {t('nav.home')}
                </button>
              )}

              <button onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }} className="mobile-menu-link">
                {t('nav.dashboard')}
              </button>

              <div className="mobile-menu-section">
                <button
                  onClick={() => setConsultasDropdownOpen(!consultasDropdownOpen)}
                  className="mobile-menu-link"
                >
                  {t('nav.consultations')}
                </button>
                {consultasDropdownOpen && (
                  <div className="mobile-submenu">
                    <a href="/consultas" className="mobile-submenu-item" onClick={(e) => {
                      e.preventDefault();
                      navigate('/consultas');
                      setMobileMenuOpen(false);
                    }}>
                      {t('nav.viewConsultations')}
                    </a>
                    <a href="/calendario" className="mobile-submenu-item" onClick={(e) => {
                      e.preventDefault();
                      navigate('/calendario');
                      setMobileMenuOpen(false);
                    }}>
                      <CalendarDate size={14} /> {t('nav.calendar')}
                    </a>
                    {(user?.role === 'utente' || user?.role === 'administrativo') && (
                      <a href="/consultas/nova" className="mobile-submenu-item" onClick={(e) => {
                        e.preventDefault();
                        navigate('/consultas/nova');
                        setMobileMenuOpen(false);
                      }}>
                        <PlusLg size={14} /> {t('nav.bookAppointment')}
                      </a>
                    )}
                  </div>
                )}
              </div>

              {(user?.role === 'admin' || user?.role === 'administrativo') && (
                <button onClick={() => { navigate('/utentes/transferir'); setMobileMenuOpen(false); }} className="mobile-menu-link">
                  <ArrowLeftRight size={14} /> Transferir Utentes
                </button>
              )}

              <div className="mobile-menu-divider"></div>

              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="mobile-menu-link"
              >
                <span className="user-avatar">{user.name?.charAt(0).toUpperCase() || 'U'}</span>
                <span>{user?.name || 'Utilizador'}</span>
              </button>
              {userDropdownOpen && (
                <div className="mobile-submenu">
                  <a href="/perfil" className="mobile-submenu-item" onClick={(e) => {
                    e.preventDefault();
                    navigate('/user');
                    setMobileMenuOpen(false);
                  }}>
                    Perfil
                  </a>
                  <button className="mobile-submenu-item logout" onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}>
                    Sair
                  </button>
                </div>
              )}
            </>
          )}
          {!user && (
            <button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }} className="mobile-menu-link">
              Iniciar sessão
            </button>
          )}
          <div className="mobile-menu-divider"></div>
          <LanguageSwitcher className="navbar-language-switcher" />
        </div>
      )}
    </nav>  
  );
}