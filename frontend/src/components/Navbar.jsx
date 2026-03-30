import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import SmartNotification from './SmartNotification';

/**
 * Navbar — EcoFeed-style with language selector, theme toggle, and Live Map link.
 */
export default function Navbar() {
  const { user, logoutUser } = useAuth();
  const { lang, changeLang, t, LANGUAGES } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  const handleLogout = () => {
    logoutUser();
    navigate('/');
  };

  const getDashboardPath = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'donor': return '/donor';
      case 'receiver': return '/receiver';
      case 'volunteer': return '/volunteer';
      default: return '/';
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <nav className="navbar eco-navbar">
      <div className="nav-container">
        <Link to="/" className="nav-brand eco-brand">
          <span className="eco-brand-box">A</span>
          <span className="eco-brand-text">Anna Setu</span>
        </Link>

        <div className="nav-links">
          <Link to="/" className="nav-link">{t('home')}</Link>
          <Link to="/live-map" className="nav-link">🗺️ {t('liveMap')}</Link>

          {/* Theme Toggle — Animated Bulb */}
          <button className="theme-toggle" onClick={toggleTheme} title={isDark ? 'Switch to Light' : 'Switch to Dark'}>
            <span className={`bulb-emoji ${isDark ? 'off' : 'lit'}`}>
              {isDark ? '🌙' : '💡'}
            </span>
          </button>

          {/* Smart Notifications */}
          <SmartNotification userRole={user?.role} />

          {/* Language Selector */}
          <div className="lang-selector" ref={langRef}>
            <button
              className="lang-btn"
              onClick={() => setLangOpen(!langOpen)}
            >
              🌐 {currentLang.label}
              <span className="lang-arrow">{langOpen ? '▲' : '▼'}</span>
            </button>
            {langOpen && (
              <div className="lang-dropdown">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    className={`lang-option ${lang === l.code ? 'active' : ''}`}
                    onClick={() => { changeLang(l.code); setLangOpen(false); }}
                  >
                    <span className="lang-flag">{l.flag}</span>
                    <span className="lang-name">{l.name}</span>
                    <span className="lang-code">{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {user ? (
            <>
              <Link to={getDashboardPath()} className="nav-link">
                {t('dashboard')}
              </Link>
              <div className="nav-user">
                <span className="user-badge" data-role={user.role}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
                <span className="user-name">{user.name}</span>
                <button onClick={handleLogout} className="eco-btn eco-btn-logout">
                  {t('logout')}
                </button>
              </div>
            </>
          ) : (
            <Link to="/login" className="eco-btn eco-btn-login">
              <span className="login-icon">→</span> {t('login')}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
