import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { login as loginAPI, signup as signupAPI } from '../api';

/**
 * Home — EcoFeed-style landing page with integrated role-based auth.
 * Once logged in, user is redirected to their dashboard automatically.
 * No need to login separately for each role.
 */
export default function Home() {
  const { user, loginUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [selectedRole, setSelectedRole] = useState('donor');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await loginAPI({
        email: formData.email,
        password: formData.password,
      });
      loginUser(data);
      switch (data.role) {
        case 'donor': navigate('/donor'); break;
        case 'receiver': navigate('/receiver'); break;
        case 'volunteer': navigate('/volunteer'); break;
        default: navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: selectedRole,
        phone: formData.phone,
        location: {
          address: formData.address,
          lat: 28.6139 + (Math.random() - 0.5) * 0.1,
          lng: 77.209 + (Math.random() - 0.5) * 0.1,
        },
      };
      const { data } = await signupAPI(payload);
      loginUser(data);
      switch (data.role) {
        case 'donor': navigate('/donor'); break;
        case 'receiver': navigate('/receiver'); break;
        case 'volunteer': navigate('/volunteer'); break;
        default: navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'donor', label: 'Donor', icon: '🍽️', desc: 'I have food to donate', color: '#16a34a' },
    { value: 'receiver', label: 'Receiver', icon: '🏠', desc: 'NGO / Shelter seeking food', color: '#3b82f6' },
    { value: 'volunteer', label: 'Volunteer', icon: '🚗', desc: 'I can deliver food', color: '#f59e0b' },
  ];

  // If already logged in, redirect to dashboard
  if (user) {
    return (
      <div className="home-page">
        {/* Hero Section - Logged In */}
        <section className="eco-hero">
          <div className="eco-hero-content">
            <h1 className="eco-hero-title">
            <span className="eco-italic">{t('welcomeBack')}</span>
            <br />
            <span className="eco-green">{user.name}!</span>
          </h1>
          <p className="eco-hero-subtitle">
            Continue making a difference with Anna Setu. Your dashboard awaits.
          </p>
          <Link to={`/${user.role}`} className="eco-btn eco-btn-primary">
            {t('goToDashboard')} <span className="eco-arrow">→</span>
          </Link>
          </div>
          <div className="eco-hero-image">
            <div className="eco-image-card">
              <img src="/hero-children.jpg" alt="Children receiving food" className="eco-hero-img" />
            </div>
          </div>
        </section>

        {/* Keep existing sections below */}
        {renderStatsSection()}
        {renderHowItWorks()}
        {renderRolesSection()}
      </div>
    );
  }

  return (
    <div className="home-page">
      {/* EcoFeed-Style Hero Section */}
      <section className="eco-hero">
        <div className="eco-hero-content">
          <h1 className="eco-hero-title">
            <span className="eco-italic">{t('heroTitle1')}</span>
            <br />
            <span className="eco-green">{t('heroTitle2')}</span>
          </h1>
          <p className="eco-hero-subtitle">
            {t('heroSubtitle')}
          </p>
          <button
            className="eco-btn eco-btn-primary"
            onClick={() => {
              setShowAuthModal(true);
              setAuthMode('signup');
            }}
          >
            {t('getStarted')} <span className="eco-arrow">→</span>
          </button>
        </div>
        <div className="eco-hero-image">
          <div className="eco-image-card">
            <img src="/hero-children.jpg" alt="Children receiving food" className="eco-hero-img" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {renderStatsSection()}

      {/* How It Works */}
      {renderHowItWorks()}

      {/* Roles Section */}
      {renderRolesSection()}

      {/* AI Freshness & Real-time Notifications */}
      {renderFeaturesSection()}

      {/* Live Map Preview Section */}
      {renderLiveMapSection()}

      {/* Auth Modal Overlay */}
      {showAuthModal && (
        <div className="auth-modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <button className="auth-modal-close" onClick={() => setShowAuthModal(false)}>✕</button>
            
            <div className="auth-modal-header">
              <span className="auth-modal-icon">🍽️</span>
              <h2>Anna Setu</h2>
              <p>{authMode === 'login' ? 'Welcome back! Sign in to continue.' : 'Create your account and start making a difference.'}</p>
            </div>

            {/* Auth Mode Toggle */}
            <div className="auth-toggle">
              <button
                className={`auth-toggle-btn ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => { setAuthMode('login'); setError(''); }}
              >
                Sign In
              </button>
              <button
                className={`auth-toggle-btn ${authMode === 'signup' ? 'active' : ''}`}
                onClick={() => { setAuthMode('signup'); setError(''); }}
              >
                Create Account
              </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="auth-form">
                <div className="form-group">
                  <label htmlFor="login-email">Email Address</label>
                  <input
                    type="email"
                    id="login-email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="login-password">Password</label>
                  <input
                    type="password"
                    id="login-password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                  />
                </div>
                <button type="submit" className="eco-btn eco-btn-primary eco-btn-full" disabled={loading}>
                  {loading ? <span className="spinner-sm"></span> : 'Sign In'}
                </button>
                <p className="auth-modal-footer">
                  Don't have an account?{' '}
                  <button type="button" className="auth-link" onClick={() => { setAuthMode('signup'); setError(''); }}>
                    Create Account
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="auth-form">
                {/* Role Selection */}
                <div className="form-group">
                  <label>Select Your Role</label>
                  <div className="eco-role-selector">
                    {roles.map((r) => (
                      <label
                        key={r.value}
                        className={`eco-role-option ${selectedRole === r.value ? 'active' : ''}`}
                        style={{ '--role-color': r.color }}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={r.value}
                          checked={selectedRole === r.value}
                          onChange={() => setSelectedRole(r.value)}
                        />
                        <span className="eco-role-icon">{r.icon}</span>
                        <span className="eco-role-label">{r.label}</span>
                        <span className="eco-role-desc">{r.desc}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="signup-name">Full Name</label>
                    <input
                      type="text"
                      id="signup-name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="signup-email">Email Address</label>
                    <input
                      type="email"
                      id="signup-email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="signup-password">Password</label>
                    <input
                      type="password"
                      id="signup-password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min 6 characters"
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="signup-phone">Phone Number</label>
                    <input
                      type="tel"
                      id="signup-phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="signup-address">Address / Location</label>
                  <input
                    type="text"
                    id="signup-address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter your address"
                  />
                </div>

                <button type="submit" className="eco-btn eco-btn-primary eco-btn-full" disabled={loading}>
                  {loading ? <span className="spinner-sm"></span> : 'Create Account'}
                </button>
                <p className="auth-modal-footer">
                  Already have an account?{' '}
                  <button type="button" className="auth-link" onClick={() => { setAuthMode('login'); setError(''); }}>
                    Sign In
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );

  /* ============ Reusable Section Renderers ============ */
  function renderStatsSection() {
    return (
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">🍛</span>
            <h3 className="stat-number">1,000+</h3>
            <p className="stat-label">{t('mealsRedistributed')}</p>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🤝</span>
            <h3 className="stat-number">150+</h3>
            <p className="stat-label">{t('activeDonors')}</p>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🏠</span>
            <h3 className="stat-number">50+</h3>
            <p className="stat-label">{t('ngosAndShelters')}</p>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🚗</span>
            <h3 className="stat-number">80+</h3>
            <p className="stat-label">{t('volunteers')}</p>
          </div>
        </div>
      </section>
    );
  }

  function renderHowItWorks() {
    return (
      <section className="how-section">
        <h2 className="section-title">{t('howItWorks')}</h2>
        <p className="section-subtitle">{t('simpleSteps')}</p>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <div className="step-icon">📝</div>
            <h3>{t('donorListsFood')}</h3>
            <p>{t('donorListsFoodDesc')}</p>
          </div>
          <div className="step-connector">→</div>
          <div className="step-card">
            <div className="step-number">2</div>
            <div className="step-icon">🔍</div>
            <h3>{t('receiverRequests')}</h3>
            <p>{t('receiverRequestsDesc')}</p>
          </div>
          <div className="step-connector">→</div>
          <div className="step-card">
            <div className="step-number">3</div>
            <div className="step-icon">🚚</div>
            <h3>{t('volunteerDelivers')}</h3>
            <p>{t('volunteerDeliversDesc')}</p>
          </div>
          <div className="step-connector">→</div>
          <div className="step-card">
            <div className="step-number">4</div>
            <div className="step-icon">🎉</div>
            <h3>{t('impactMade')}</h3>
            <p>{t('impactMadeDesc')}</p>
          </div>
        </div>
      </section>
    );
  }

  function renderRolesSection() {
    return (
      <section className="roles-section">
        <h2 className="section-title">{t('joinAs')}</h2>
        <p className="section-subtitle">{t('chooseRole')}</p>
        <div className="roles-grid">
          <div className="role-card role-donor">
            <div className="role-icon">🟢</div>
            <h3>{t('donor')}</h3>
            <p>{t('donorDesc')}</p>
            <ul>
              <li>{t('donorFeature1')}</li>
              <li>{t('donorFeature2')}</li>
              <li>{t('donorFeature3')}</li>
            </ul>
            <Link to="/donor" className="btn btn-primary">
              {t('donor')}
            </Link>
          </div>
          <div className="role-card role-receiver">
            <div className="role-icon">🔵</div>
            <h3>{t('receiver')}</h3>
            <p>{t('receiverDesc')}</p>
            <ul>
              <li>{t('receiverFeature1')}</li>
              <li>{t('receiverFeature2')}</li>
              <li>{t('receiverFeature3')}</li>
            </ul>
            <Link to="/receiver" className="btn btn-primary">
              {t('receiver')}
            </Link>
          </div>
          <div className="role-card role-volunteer">
            <div className="role-icon">🟡</div>
            <h3>{t('volunteer')}</h3>
            <p>{t('volunteerDesc')}</p>
            <ul>
              <li>{t('volunteerFeature1')}</li>
              <li>{t('volunteerFeature2')}</li>
              <li>{t('volunteerFeature3')}</li>
            </ul>
            <Link to="/volunteer" className="btn btn-primary">
              {t('volunteer')}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  function renderFeaturesSection() {
    return (
      <section className="features-section">
        <h2 className="section-title">🚀 Smart Features</h2>
        <p className="section-subtitle">AI-powered tools and real-time communication for maximum efficiency</p>
        
        <div className="features-grid">
          {/* AI-based Freshness Validation */}
          <div className="feature-card feature-ai">
            <div className="feature-icon-wrap">
              <span className="feature-icon">🤖</span>
              <span className="feature-badge">AI Powered</span>
            </div>
            <h3>AI-based Freshness Validation</h3>
            <p className="feature-desc">
              Our AI system automatically validates the freshness of donated food items using 
              image recognition and environmental data, ensuring only safe, quality food reaches those in need.
            </p>
            <ul className="feature-list">
              <li>
                <span className="feature-check">✅</span>
                Image-based food quality assessment
              </li>
              <li>
                <span className="feature-check">✅</span>
                Auto-assignment for faster response
              </li>
              <li>
                <span className="feature-check">✅</span>
                Expiry time prediction & alerts
              </li>
              <li>
                <span className="feature-check">✅</span>
                Smart matching of food to nearby receivers
              </li>
            </ul>
            <div className="feature-visual">
              <div className="ai-scan-demo">
                <div className="scan-circle">
                  <span>🍛</span>
                </div>
                <div className="scan-result">
                  <span className="scan-label">Freshness Score</span>
                  <div className="scan-bar">
                    <div className="scan-fill" style={{ width: '92%' }}></div>
                  </div>
                  <span className="scan-value">92% Fresh</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Notifications */}
          <div className="feature-card feature-notifications">
            <div className="feature-icon-wrap">
              <span className="feature-icon">🔔</span>
              <span className="feature-badge feature-badge-blue">Live</span>
            </div>
            <h3>Real-time Notifications</h3>
            <p className="feature-desc">
              Users receive instant alerts on food donations and requests, ensuring timely action 
              and efficient communication among donors, receivers, and volunteers to reduce waste effectively.
            </p>
            <ul className="feature-list">
              <li>
                <span className="feature-check">✅</span>
                Instant alerts for new food donations
              </li>
              <li>
                <span className="feature-check">✅</span>
                Request status updates in real-time
              </li>
              <li>
                <span className="feature-check">✅</span>
                Volunteer pickup & delivery tracking
              </li>
              <li>
                <span className="feature-check">✅</span>
                Role-based notification preferences
              </li>
            </ul>
            <div className="feature-visual">
              <div className="notif-demo">
                <div className="notif-item notif-new">
                  <span className="notif-dot"></span>
                  <div>
                    <strong>New Food Available!</strong>
                    <p>50 meals from Hotel Udupi Grand — 2 km away</p>
                  </div>
                  <span className="notif-time">2m ago</span>
                </div>
                <div className="notif-item">
                  <span className="notif-dot notif-dot-blue"></span>
                  <div>
                    <strong>Request Accepted</strong>
                    <p>Your request for Biryani has been approved</p>
                  </div>
                  <span className="notif-time">15m ago</span>
                </div>
                <div className="notif-item">
                  <span className="notif-dot notif-dot-green"></span>
                  <div>
                    <strong>Delivery Complete ✅</strong>
                    <p>30 meals delivered to BTM NGO Kitchen</p>
                  </div>
                  <span className="notif-time">1h ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderLiveMapSection() {
    return (
      <section className="livemap-preview-section">
        <h2 className="section-title">🗺️ {t('liveMapTitle')}</h2>
        <p className="section-subtitle">{t('liveMapSubtitle')}</p>
        
        <div className="livemap-preview-grid">
          <div className="livemap-preview-card">
            <div className="livemap-preview-icon">📍</div>
            <h3>{t('donationPoints')}</h3>
            <p className="livemap-preview-num">6+</p>
            <p className="livemap-preview-desc">Active food donation locations across the city</p>
          </div>
          <div className="livemap-preview-card">
            <div className="livemap-preview-icon">🚗</div>
            <h3>{t('volunteerRoutes')}</h3>
            <p className="livemap-preview-num">3+</p>
            <p className="livemap-preview-desc">Volunteers actively delivering food right now</p>
          </div>
          <div className="livemap-preview-card">
            <div className="livemap-preview-icon">🏢</div>
            <h3>{t('distributionCenters')}</h3>
            <p className="livemap-preview-num">4+</p>
            <p className="livemap-preview-desc">Community centers and NGO kitchens ready to serve</p>
          </div>
        </div>

        <div className="livemap-preview-cta">
          <Link to="/live-map" className="eco-btn eco-btn-primary">
            {t('viewFullMap')} <span className="eco-arrow">→</span>
          </Link>
        </div>
      </section>
    );
  }
}
