import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

/**
 * RoleSelectionPage — Modern card-based role selection page.
 * Displays 3 animated cards for Donor, Receiver, and Volunteer.
 */
export default function RoleSelectionPage() {
  const { t } = useLanguage();

  const roles = [
    {
      key: 'donor',
      icon: '🟢',
      emoji: '🍽️',
      title: t('donor'),
      color: '#16a34a',
      glow: 'rgba(22, 163, 74, 0.15)',
      gradient: 'linear-gradient(135deg, #16a34a, #22c55e)',
      path: '/donor',
      description: t('donorDesc'),
      features: [t('donorFeature1'), t('donorFeature2'), t('donorFeature3')],
    },
    {
      key: 'receiver',
      icon: '🔵',
      emoji: '🏠',
      title: t('receiver'),
      color: '#3b82f6',
      glow: 'rgba(59, 130, 246, 0.15)',
      gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
      path: '/receiver',
      description: t('receiverDesc'),
      features: [t('receiverFeature1'), t('receiverFeature2'), t('receiverFeature3')],
    },
    {
      key: 'volunteer',
      icon: '🟡',
      emoji: '🚗',
      title: t('volunteer'),
      color: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.15)',
      gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
      path: '/volunteer',
      description: t('volunteerDesc'),
      features: [t('volunteerFeature1'), t('volunteerFeature2'), t('volunteerFeature3')],
    },
  ];

  return (
    <div className="role-select-page">
      <div className="role-select-header">
        <h1>Choose Your Role</h1>
        <p>Select how you'd like to contribute to reducing food waste</p>
      </div>

      <div className="role-select-grid">
        {roles.map((role, index) => (
          <Link
            to={role.path}
            key={role.key}
            className="role-select-card"
            style={{
              '--role-color': role.color,
              '--role-glow': role.glow,
              '--role-gradient': role.gradient,
              animationDelay: `${index * 0.15}s`,
            }}
          >
            <div className="role-select-icon-wrap">
              <span className="role-select-dot">{role.icon}</span>
              <span className="role-select-emoji">{role.emoji}</span>
            </div>

            <h2 className="role-select-title">{role.title}</h2>
            <p className="role-select-desc">{role.description}</p>

            <ul className="role-select-features">
              {role.features.map((f, i) => (
                <li key={i}><span>✓</span> {f}</li>
              ))}
            </ul>

            <div className="role-select-cta">
              Continue as {role.title} <span className="role-select-arrow">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
