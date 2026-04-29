import { createContext, useContext, useState, useEffect } from 'react';
import { guestLogin as guestLoginAPI } from '../api';

const AuthContext = createContext(null);

/**
 * AuthProvider wraps the app and provides user state + auth helpers.
 * User data (including JWT) is persisted in localStorage.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const loginUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logoutUser = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  /**
   * Auto-login as a guest user for a given role.
   * Creates a guest account on the backend if it doesn't exist,
   * then stores the JWT token for subsequent API calls.
   */
  const ensureGuestLogin = async (role) => {
    // If user is already logged in with the correct role, skip
    if (user && user.role === role && user.token) {
      return user;
    }

    try {
      const res = await guestLoginAPI(role);
      const userData = res.data;
      loginUser(userData);
      return userData;
    } catch (err) {
      console.error('Guest login failed:', err);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser, ensureGuestLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
