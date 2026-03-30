import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getFoods, createRequest, getRequests, getDeliveries } from '../api';
import FoodCard from '../components/FoodCard';
import MapView from '../components/MapView';

/**
 * ReceiverDashboard — Receiver can view available food, request it, and track deliveries.
 */
export default function ReceiverDashboard() {
  const { user } = useAuth();
  const { playSoftAlert, playSuccessSound } = useTheme();
  const [foods, setFoods] = useState([]);
  const [requests, setRequests] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [foodRes, reqRes, delRes] = await Promise.all([
        getFoods(),
        getRequests(),
        getDeliveries(),
      ]);
      setFoods(foodRes.data);
      setRequests(reqRes.data);
      setDeliveries(delRes.data);
      // Play soft alert if new food is available
      if (foodRes.data.length > 0) playSoftAlert();
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (food) => {
    if (!user) {
      setAlert({ type: 'error', message: 'Please login to request food!' });
      setTimeout(() => setAlert(null), 3000);
      return;
    }
    try {
      await createRequest({ foodId: food._id, message: `Request from ${user.name}` });
      playSuccessSound();
      setAlert({ type: 'success', message: 'Food requested successfully! 🎉' });
      fetchData();
      setTimeout(() => setAlert(null), 3000);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to request food' });
      setTimeout(() => setAlert(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const mapMarkers = [
    ...foods.map(f => ({
      lat: f.location?.lat,
      lng: f.location?.lng,
      label: f.foodType,
      address: f.location?.address,
      type: 'pickup',
    })),
    ...(user?.location ? [{
      lat: user.location?.lat,
      lng: user.location?.lng,
      label: 'Your Location',
      address: user.location?.address,
      type: 'drop',
    }] : []),
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>🔵 Receiver Dashboard</h1>
          <p>Welcome{user ? `, ${user.name}` : ''}! Browse and request available food.</p>
        </div>
        <button className="btn btn-primary" onClick={fetchData}>
          🔄 Refresh
        </button>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>{alert.message}</div>
      )}

      {/* Dashboard Tabs */}
      <div className="tab-bar">
        <button className={`tab ${activeTab === 'available' ? 'active' : ''}`} onClick={() => setActiveTab('available')}>
          🍱 Available Food ({foods.length})
        </button>
        <button className={`tab ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
          📨 My Requests ({requests.length})
        </button>
        <button className={`tab ${activeTab === 'deliveries' ? 'active' : ''}`} onClick={() => setActiveTab('deliveries')}>
          🚚 Deliveries ({deliveries.length})
        </button>
        <button className={`tab ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
          🗺️ Map
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'available' && (
          <div className="food-grid">
            {foods.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🔍</span>
                <h3>No food available right now</h3>
                <p>Check back soon! New listings appear as donors add food.</p>
              </div>
            ) : (
              foods.map((food) => (
                <FoodCard
                  key={food._id}
                  food={food}
                  showDonor={true}
                  actionLabel="🙏 Request Food"
                  onAction={handleRequest}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="requests-list">
            {requests.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📨</span>
                <h3>No requests yet</h3>
                <p>Request food from the "Available Food" tab!</p>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req._id} className="request-card">
                  <div className="request-info">
                    <h4>{req.foodId?.foodType || 'Food Item'}</h4>
                    <p>📦 Quantity: {req.foodId?.quantity}</p>
                    <p>👤 Donor: {req.foodId?.donorId?.name || 'N/A'}</p>
                    <p>📍 {req.foodId?.location?.address || 'N/A'}</p>
                  </div>
                  <span className={`status-badge status-${req.status}`}>{req.status}</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'deliveries' && (
          <div className="deliveries-list">
            {deliveries.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🚚</span>
                <h3>No deliveries yet</h3>
                <p>Once your request is approved, deliveries will appear here.</p>
              </div>
            ) : (
              deliveries.map((del) => (
                <div key={del._id} className="delivery-card">
                  <div className="delivery-info">
                    <h4>{del.foodId?.foodType || 'Food Item'}</h4>
                    <p>📍 Pickup: {del.pickupLocation?.address || 'N/A'}</p>
                    <p>📍 Drop: {del.dropLocation?.address || 'N/A'}</p>
                    {del.volunteerId && <p>🚗 Volunteer: {del.volunteerId.name} ({del.volunteerId.phone})</p>}
                  </div>
                  <div className="delivery-status">
                    <div className="status-tracker">
                      <div className={`status-step ${['pending','accepted','picked','delivered'].indexOf(del.status) >= 0 ? 'active' : ''}`}>Pending</div>
                      <div className={`status-step ${['accepted','picked','delivered'].indexOf(del.status) >= 0 ? 'active' : ''}`}>Accepted</div>
                      <div className={`status-step ${['picked','delivered'].indexOf(del.status) >= 0 ? 'active' : ''}`}>Picked</div>
                      <div className={`status-step ${del.status === 'delivered' ? 'active' : ''}`}>Delivered ✅</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'map' && (
          <MapView markers={mapMarkers} />
        )}
      </div>
    </div>
  );
}
