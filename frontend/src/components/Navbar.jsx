import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Navbar — Top navigation bar with brand, nav links, and auth controls.
 * Shows different links based on user role.
 */
export default function Navbar() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  // Determine dashboard route based on role
  const getDashboardPath = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'donor': return '/donor';
      case 'receiver': return '/receiver';
      case 'volunteer': return '/volunteer';
      default: return '/';
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          <span className="brand-icon">🍽️</span>
          <span className="brand-text">Anna Setu</span>
        </Link>

        <div className="nav-links">
          <Link to="/" className="nav-link">Home</Link>

          {user ? (
            <>
              <Link to={getDashboardPath()} className="nav-link">
                Dashboard
              </Link>
              <div className="nav-user">
                <span className="user-badge" data-role={user.role}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
                <span className="user-name">{user.name}</span>
                <button onClick={handleLogout} className="btn btn-outline btn-sm">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/signup" className="btn btn-primary btn-sm">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
