import { useLanguage } from '../context/LanguageContext';

/**
 * Footer — Translated footer with branding and links.
 */
export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <span className="brand-icon">🍽️</span>
          <span>Anna Setu</span>
          <p className="footer-tagline">{t('footerTagline')}</p>
        </div>

        <div className="footer-links">
          <div className="footer-col">
            <h4>{t('platform')}</h4>
            <a href="/">{t('home')}</a>
            <a href="/live-map">🗺️ {t('liveMap')}</a>
          </div>
          <div className="footer-col">
            <h4>{t('roles')}</h4>
            <a href="/donor">{t('becomeDonor')}</a>
            <a href="/receiver">{t('registerNGO')}</a>
            <a href="/volunteer">{t('joinVolunteer')}</a>
          </div>
          <div className="footer-col">
            <h4>{t('about')}</h4>
            <a href="/">{t('ourMission')}</a>
            <a href="/">{t('contactUs')}</a>
            <a href="/">{t('privacyPolicy')}</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} {t('footerCopyright')}</p>
        </div>
      </div>
    </footer>
  );
}
