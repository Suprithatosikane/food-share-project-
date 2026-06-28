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

  const updateLiveLocation = async (currentUser) => {
    if (!currentUser) return;

    const saveLocationToServer = async (lat, lng, addressName) => {
      try {
        const { updateLocation: apiUpdateLocation } = await import('../api');
        const res = await apiUpdateLocation({ address: addressName, lat, lng });
        if (res.data) {
          const updatedUser = { ...currentUser, location: res.data.location };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          console.log("User live location dynamically updated:", addressName);
        }
      } catch (err) {
        console.error("Failed to update user location in context:", err);
      }
    };

    const fetchIpLocationFallback = async () => {
      try {
        console.log("Fetching location via IP fallback...");
        // Use ip-api for free IP geolocation
        const res = await fetch("http://ip-api.com/json/");
        const data = await res.json();
        
        if (data && data.lat && data.lon) {
          let addressName = `${data.city || 'Unknown City'}, ${data.regionName || ''}`;
          
          try {
            const revRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${data.lat}&lon=${data.lon}&zoom=18&addressdetails=1`);
            const revData = await revRes.json();
            if (revData && revData.display_name) {
              addressName = revData.display_name;
            }
          } catch (e) {
            console.error("Reverse geocoding (IP) failed", e);
          }
          
          await saveLocationToServer(data.lat, data.lon, addressName);
        }
      } catch (err) {
        console.error("IP fallback also failed:", err);
      }
    };

    if (!navigator.geolocation) {
      console.log("Geolocation is not supported. Using IP fallback.");
      return fetchIpLocationFallback();
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let addressName = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          const data = await response.json();
          if (data && data.display_name) {
            addressName = data.display_name;
          }
        } catch (e) {
          console.error("Reverse geocoding failed", e);
        }
        await saveLocationToServer(latitude, longitude, addressName);
      },
      (error) => {
        console.warn("GPS Geolocation failed. Triggering IP fallback.", error.message);
        fetchIpLocationFallback();
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  };

  // On mount, restore user from localStorage and update geolocation
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      updateLiveLocation(u);
    }
    setLoading(false);
  }, []);

  const loginUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    updateLiveLocation(userData);
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
      updateLiveLocation(user);
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
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser, ensureGuestLogin, updateLiveLocation }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
