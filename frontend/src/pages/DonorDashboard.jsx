import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createFood, getFoods, getRequests, getDeliveries, getDailyRequirements, acceptDailyRequirement } from '../api';
import FoodCard from '../components/FoodCard';
import MapView from '../components/MapView';
import VoiceAssistant from '../components/VoiceAssistant';
import FoodDetector from '../components/FoodDetector';

/**
 * DonorDashboard — Donor can add food, view their listings, track requests, and fulfill daily requirements.
 */
export default function DonorDashboard() {
  const { user, ensureGuestLogin } = useAuth();
  const [foods, setFoods] = useState([]);
  const [requests, setRequests] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('listings');
  const [alert, setAlert] = useState(null);
  const [formData, setFormData] = useState({
    foodType: '',
    quantity: '',
    description: '',
    expiryHours: '6',
    address: user?.location?.address || '',
  });

  // Daily Food Requirement Notification State
  const [activeDailyRequest, setActiveDailyRequest] = useState(null);

  // Haversine formula to compute distance in km between two coordinate pairs
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    const loadData = async () => {
      // Auto-login as guest donor if needed
      const loggedInUser = await ensureGuestLogin('donor');
      if (loggedInUser) {
        setFormData(prev => ({
          ...prev,
          address: loggedInUser.location?.address || prev.address
        }));
        await fetchData();
      } else {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Short-polling to check for pending daily requirements nearby
  useEffect(() => {
    if (!user) return;

    const checkDailyRequirements = async () => {
      try {
        const { data } = await getDailyRequirements();
        
        // Load ignored requests from localStorage
        let ignored = [];
        try {
          const stored = localStorage.getItem('ignoredDailyRequests');
          if (stored) ignored = JSON.parse(stored);
        } catch (e) {
          console.error('Error reading ignored list:', e);
        }

        // Filter: status is pending, not ignored, and distance <= 5 km
        const nearby = data.filter(req => {
          if (req.status !== 'pending') return false;
          if (ignored.includes(req._id)) return false;
          
          const donorLat = user.location?.lat || 12.9716;
          const donorLng = user.location?.lng || 77.5946;
          const receiverLat = req.location?.lat || 0;
          const receiverLng = req.location?.lng || 0;
          
          const distance = calculateDistance(donorLat, donorLng, receiverLat, receiverLng);
          return distance <= 5; // 5 km threshold
        });

        if (nearby.length > 0) {
          // Display the first matching pending request
          setActiveDailyRequest(nearby[0]);
        } else {
          setActiveDailyRequest(null);
        }
      } catch (err) {
        console.error('Error fetching daily requirements:', err);
      }
    };

    checkDailyRequirements();
    const interval = setInterval(checkDailyRequirements, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [user]);

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
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        foodType: formData.foodType,
        quantity: formData.quantity,
        description: formData.description,
        expiryTime: new Date(Date.now() + parseInt(formData.expiryHours) * 60 * 60 * 1000),
        location: {
          address: formData.address,
          lat: user?.location?.lat || 28.6139,
          lng: user?.location?.lng || 77.2090,
        },
      };

      await createFood(payload);
      setAlert({ type: 'success', message: 'Food availability listed! 🎉' });
      setShowForm(false);
      setFormData({ foodType: '', quantity: '', description: '', expiryHours: '6', address: user?.location?.address || '' });
      fetchData();
      setTimeout(() => setAlert(null), 3000);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to create listing' });
    }
  };

  // Voice AI command handler
  const handleVoiceCommand = (cmd) => {
    if (cmd.action === 'add_food') {
      setShowForm(true);
      setFormData(prev => ({
        ...prev,
        foodType: cmd.foodType || prev.foodType,
        quantity: cmd.quantity || prev.quantity,
        address: cmd.location || prev.address,
      }));
      setAlert({ type: 'success', message: `🎤 Voice: Form filled with "${cmd.foodType || 'food'} — ${cmd.quantity || ''} — ${cmd.location || ''}"` });
      setTimeout(() => setAlert(null), 4000);
    }
  };

  // Food detector handler
  const handleFoodDetected = (result) => {
    setFormData(prev => ({
      ...prev,
      foodType: result.type,
      quantity: result.servings + ' servings',
    }));
    setShowForm(true);
    setAlert({ type: 'success', message: `🤖 AI detected: ${result.emoji} ${result.type} (${result.confidence}% confidence)` });
    setTimeout(() => setAlert(null), 4000);
  };

  // Approve/Reject requests
  const handleApprove = async (reqId) => {
    try {
      const { approveRequest } = await import('../api');
      await approveRequest(reqId);
      setAlert({ type: 'success', message: 'Request approved! ✅' });
      fetchData();
      setTimeout(() => setAlert(null), 3000);
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to approve' });
    }
  };

  const handleReject = async (reqId) => {
    try {
      const { rejectRequest } = await import('../api');
      await rejectRequest(reqId);
      setAlert({ type: 'success', message: 'Request rejected' });
      fetchData();
      setTimeout(() => setAlert(null), 3000);
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to reject' });
    }
  };

  const handleAcceptDailyRequest = async (id) => {
    try {
      await acceptDailyRequirement(id);
      setAlert({ type: 'success', message: 'Daily food requirement accepted and scheduled! 🎉' });
      setActiveDailyRequest(null);
      fetchData(); // Refresh listings and deliveries tabs
      setTimeout(() => setAlert(null), 3000);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to accept daily requirement' });
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const handleIgnoreDailyRequest = (id) => {
    try {
      let ignored = [];
      const stored = localStorage.getItem('ignoredDailyRequests');
      if (stored) ignored = JSON.parse(stored);
      
      if (!ignored.includes(id)) {
        ignored.push(id);
        localStorage.setItem('ignoredDailyRequests', JSON.stringify(ignored));
      }
    } catch (e) {
      console.error('Error saving ignored daily request:', e);
    }
    setActiveDailyRequest(null);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const mapMarkers = foods.map(f => ({
    lat: f.location?.lat,
    lng: f.location?.lng,
    label: f.foodType,
    address: f.location?.address,
    type: 'pickup',
  }));

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>🟢 Donor Dashboard</h1>
          <p>Welcome{user ? `, ${user.name}` : ''}! Share your surplus food with the community.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Close Form' : '➕ Add Food Listing'}
        </button>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>{alert.message}</div>
      )}

      {/* Add Food Form */}
      {showForm && (
        <div className="card form-card" style={{ marginBottom: '2rem' }}>
          <h3>📝 Add New Food Listing</h3>
          <form onSubmit={handleSubmit} className="food-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="foodType">Food Type</label>
                <input
                  type="text"
                  id="foodType"
                  value={formData.foodType}
                  onChange={(e) => setFormData({ ...formData, foodType: e.target.value })}
                  placeholder="e.g., Cooked Rice, Bread, Fruits"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="quantity">Quantity</label>
                <input
                  type="text"
                  id="quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="e.g., 50 plates, 10 kg"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Freshness, dietary info, or any details..."
                rows={2}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="expiryHours">Expires In (hours)</label>
                <select
                  id="expiryHours"
                  value={formData.expiryHours}
                  onChange={(e) => setFormData({ ...formData, expiryHours: e.target.value })}
                >
                  <option value="2">2 hours</option>
                  <option value="4">4 hours</option>
                  <option value="6">6 hours</option>
                  <option value="12">12 hours</option>
                  <option value="24">24 hours</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="address">Pickup Address</label>
                <input
                  type="text"
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Where can someone pick this up?"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full">
              🚀 Post Availability
            </button>
          </form>
        </div>
      )}

      {/* Dashboard Tabs */}
      <div className="tab-bar">
        <button className={`tab ${activeTab === 'listings' ? 'active' : ''}`} onClick={() => setActiveTab('listings')}>
          🍱 My Listings ({foods.length})
        </button>
        <button className={`tab ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
          📨 Incoming Requests ({requests.length})
        </button>
        <button className={`tab ${activeTab === 'deliveries' ? 'active' : ''}`} onClick={() => setActiveTab('deliveries')}>
          🚚 Deliveries ({deliveries.length})
        </button>
        <button className={`tab ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
          🗺️ Live Tracking
        </button>
        <button className={`tab ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>
          🤖 AI Tools
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'listings' && (
          <div className="food-grid">
            {foods.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🍽️</span>
                <h3>No active listings</h3>
                <p>Click "Add Food" to start sharing!</p>
              </div>
            ) : (
              foods.map((food) => (
                <FoodCard key={food._id} food={food} />
              ))
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="requests-list">
            {requests.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📨</span>
                <h3>No pending requests</h3>
                <p>Requests from neighbors will appear here.</p>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req._id} className="request-card">
                  <div className="request-info">
                    <h4>{req.foodId?.foodType || 'Food Item'}</h4>
                    <p>📦 Requested: {req.requestedQuantity || req.foodId?.quantity}</p>
                    <p>📋 Remaining in listing: {req.foodId?.quantity}</p>
                    <p>Requested by: {req.receiverId?.name || 'Receiver'}</p>
                    {req.message && <p className="request-message">"{req.message}"</p>}
                    <span className={`status-badge status-${req.status}`}>{req.status}</span>
                  </div>
                  {req.status === 'pending' && (
                    <div className="request-actions">
                      <button className="btn btn-success btn-sm" onClick={() => handleApprove(req._id)}>
                        ✅ Approve
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleReject(req._id)}>
                        ❌ Reject
                      </button>
                    </div>
                  )}
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
                <h3>No active deliveries</h3>
                <p>Track your food until it reaches the receiver here.</p>
              </div>
            ) : (
              deliveries.map((del) => (
                <div key={del._id} className="delivery-card">
                  <div className="delivery-info">
                    <h4>{del.foodId?.foodType || 'Food Item'} ({del.requestedQuantity || del.foodId?.quantity})</h4>
                    <p>📍 {del.dropLocation?.address || 'N/A'}</p>
                    {del.volunteerId && <p>🚗 Volunteer: {del.volunteerId.name}</p>}
                  </div>
                  <div className="delivery-status">
                    <div className="status-tracker">
                      <div className={`status-step ${['pending','accepted','picked','delivered'].indexOf(del.status) >= 0 ? 'active' : ''}`}>Wait</div>
                      <div className={`status-step ${['accepted','picked','delivered'].indexOf(del.status) >= 0 ? 'active' : ''}`}>Picked</div>
                      <div className={`status-step ${del.status === 'delivered' ? 'active' : ''}`}>Done</div>
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

        {activeTab === 'ai' && (
          <div className="ai-tools-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <VoiceAssistant onCommand={handleVoiceCommand} />
            <FoodDetector onDetect={handleFoodDetected} />
          </div>
        )}
      </div>

      {/* Daily Requirement Alert Popup Modal */}
      {activeDailyRequest && (
        <div className="auth-modal-overlay" style={{ zIndex: 1050 }}>
          <div className="auth-modal" style={{ maxWidth: '440px' }}>
            <div className="auth-modal-header" style={{ marginBottom: '1.5rem' }}>
              <span className="auth-modal-icon" style={{ fontSize: '3rem' }}>🍽️</span>
              <h2>Daily Food Requirement</h2>
              <p>A receiver near you requires meals today.</p>
            </div>

            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '16px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '1.15rem', margin: '0 0 0.5rem 0', fontWeight: 700, color: '#16a34a' }}>
                🍽️ A receiver near you requires {activeDailyRequest.quantity} meals today. Would you like to fulfill this request?
              </p>
              {activeDailyRequest.mealType && (
                <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Meal preference: <strong>{activeDailyRequest.mealType}</strong>
                </p>
              )}
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                📍 {activeDailyRequest.location?.address || 'Nearby Location'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                className="btn btn-success btn-full"
                onClick={() => handleAcceptDailyRequest(activeDailyRequest._id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.85rem' }}
              >
                ✅ Accept Request
              </button>
              <button
                className="btn btn-danger btn-full"
                onClick={() => handleIgnoreDailyRequest(activeDailyRequest._id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.85rem' }}
              >
                ❌ Ignore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
