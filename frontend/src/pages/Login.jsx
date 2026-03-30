import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { login as loginAPI, signup as signupAPI } from '../api';

/**
 * Login — Animated sliding Login/Signup page with role-based auth.
 * Uses CSS transitions for smooth panel switching.
 */
export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', phone: '', address: '', role: 'donor',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await loginAPI({ email: formData.email, password: formData.password });
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
      const { data } = await signupAPI(formData);
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
    { value: 'donor', icon: '🍽️', label: 'Donor' },
    { value: 'receiver', icon: '🏠', label: 'Receiver' },
    { value: 'volunteer', icon: '🚗', label: 'Volunteer' },
  ];

  return (
    <div className="auth-page">
      <div className={`auth-container ${isSignUp ? 'active' : ''}`}>

        {/* ===== Sign Up Form (Left Panel) ===== */}
        <div className="form-box register">
          <form onSubmit={handleSignup}>
            <h2>Create Account</h2>

            {error && isSignUp && <div className="auth-error">{error}</div>}

            <div className="input-box animation" style={{ '--li': 1 }}>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required />
              <label>Full Name</label>
              <span className="input-icon">👤</span>
            </div>

            <div className="input-box animation" style={{ '--li': 2 }}>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required />
              <label>Email</label>
              <span className="input-icon">✉️</span>
            </div>

            <div className="input-box animation" style={{ '--li': 3 }}>
              <input type="password" name="password" value={formData.password} onChange={handleChange} minLength={6} required />
              <label>Password</label>
              <span className="input-icon">🔒</span>
            </div>

            <div className="input-box animation" style={{ '--li': 4 }}>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} />
              <label>Phone</label>
              <span className="input-icon">📱</span>
            </div>

            <div className="role-selector-row animation" style={{ '--li': 5 }}>
              {roles.map(r => (
                <button
                  key={r.value}
                  type="button"
                  className={`role-chip ${formData.role === r.value ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, role: r.value })}
                >
                  <span>{r.icon}</span> {r.label}
                </button>
              ))}
            </div>

            <button type="submit" className="auth-submit-btn animation" style={{ '--li': 6 }} disabled={loading}>
              {loading ? '...' : 'Sign Up'}
            </button>

            <p className="auth-switch animation" style={{ '--li': 7 }}>
              Already have an account? <button type="button" onClick={() => { setIsSignUp(false); setError(''); }}>Login</button>
            </p>
          </form>
        </div>

        {/* ===== Login Form (Right Panel) ===== */}
        <div className="form-box login">
          <form onSubmit={handleLogin}>
            <h2>Login</h2>

            {error && !isSignUp && <div className="auth-error">{error}</div>}

            <div className="input-box animation" style={{ '--li': 1 }}>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required />
              <label>Email</label>
              <span className="input-icon">✉️</span>
            </div>

            <div className="input-box animation" style={{ '--li': 2 }}>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required />
              <label>Password</label>
              <span className="input-icon">🔒</span>
            </div>

            <button type="submit" className="auth-submit-btn animation" style={{ '--li': 3 }} disabled={loading}>
              {loading ? '...' : 'Login'}
            </button>

            <p className="auth-switch animation" style={{ '--li': 4 }}>
              Don't have an account? <button type="button" onClick={() => { setIsSignUp(true); setError(''); }}>Sign Up</button>
            </p>
          </form>
        </div>

        {/* ===== Info / Welcome Panel ===== */}
        <div className="info-panel">
          <div className="info-content toggle-panel toggle-login">
            <h2>WELCOME<br />BACK!</h2>
            <p>We are happy to have you with us again. If you need anything, we are here to help.</p>
          </div>
          <div className="info-content toggle-panel toggle-register">
            <h2>JOIN<br />ANNA SETU!</h2>
            <p>One signup for all roles — Donor, Receiver & Volunteer. Start making a difference today.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
