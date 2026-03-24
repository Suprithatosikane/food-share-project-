import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Home — Beautiful landing page showcasing the platform's mission.
 */
export default function Home() {
  const { user } = useAuth();

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-bg-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-emoji">🌾</span>
            Reduce Food Waste,
            <br />
            <span className="highlight">Feed the Needy</span>
          </h1>
          <p className="hero-subtitle">
            Anna Setu connects food donors with NGOs, shelters, and communities.
            Together, we can ensure no food goes to waste while people go hungry.
          </p>
          <div className="hero-actions">
            {user ? (
              <Link
                to={`/${user.role}`}
                className="btn btn-primary btn-lg"
              >
                Go to Dashboard →
              </Link>
            ) : (
              <>
                <Link to="/signup" className="btn btn-primary btn-lg">
                  Get Started 🚀
                </Link>
                <Link to="/login" className="btn btn-glass btn-lg">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">🍛</span>
            <h3 className="stat-number">1,000+</h3>
            <p className="stat-label">Meals Redistributed</p>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🤝</span>
            <h3 className="stat-number">150+</h3>
            <p className="stat-label">Active Donors</p>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🏠</span>
            <h3 className="stat-number">50+</h3>
            <p className="stat-label">NGOs & Shelters</p>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🚗</span>
            <h3 className="stat-number">80+</h3>
            <p className="stat-label">Volunteers</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section">
        <h2 className="section-title">How It Works</h2>
        <p className="section-subtitle">Simple steps to make a difference</p>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <div className="step-icon">📝</div>
            <h3>Donor Lists Food</h3>
            <p>Restaurants and individuals list surplus food with details and expiry time.</p>
          </div>
          <div className="step-connector">→</div>
          <div className="step-card">
            <div className="step-number">2</div>
            <div className="step-icon">🔍</div>
            <h3>Receiver Requests</h3>
            <p>NGOs and shelters browse available food and send a request.</p>
          </div>
          <div className="step-connector">→</div>
          <div className="step-card">
            <div className="step-number">3</div>
            <div className="step-icon">🚚</div>
            <h3>Volunteer Delivers</h3>
            <p>Volunteers pick up the food and deliver it to the receiver.</p>
          </div>
          <div className="step-connector">→</div>
          <div className="step-card">
            <div className="step-number">4</div>
            <div className="step-icon">🎉</div>
            <h3>Impact Made!</h3>
            <p>Food reaches those who need it. Zero waste, zero hunger.</p>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="roles-section">
        <h2 className="section-title">Join As</h2>
        <p className="section-subtitle">Choose your role and start making an impact</p>

        <div className="roles-grid">
          <div className="role-card role-donor">
            <div className="role-icon">🟢</div>
            <h3>Donor</h3>
            <p>Have surplus food? List it on Anna Setu and help feed the needy.</p>
            <ul>
              <li>Add food with details & quantity</li>
              <li>Track request status</li>
              <li>Manage your donations</li>
            </ul>
            <Link to="/signup" className="btn btn-primary">Register as Donor</Link>
          </div>

          <div className="role-card role-receiver">
            <div className="role-icon">🔵</div>
            <h3>Receiver</h3>
            <p>NGOs, shelters, or communities can request available food nearby.</p>
            <ul>
              <li>Browse available food</li>
              <li>Send requests to donors</li>
              <li>Track incoming deliveries</li>
            </ul>
            <Link to="/signup" className="btn btn-primary">Register as Receiver</Link>
          </div>

          <div className="role-card role-volunteer">
            <div className="role-icon">🟡</div>
            <h3>Volunteer</h3>
            <p>Help deliver food from donors to receivers. Be the bridge!</p>
            <ul>
              <li>View delivery tasks</li>
              <li>Accept & complete deliveries</li>
              <li>Track pickup & drop locations</li>
            </ul>
            <Link to="/signup" className="btn btn-primary">Register as Volunteer</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
