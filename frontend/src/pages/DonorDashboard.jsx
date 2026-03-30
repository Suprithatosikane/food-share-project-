import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createFood, getFoods, getRequests, getDeliveries } from '../api';
import FoodCard from '../components/FoodCard';
import MapView from '../components/MapView';
import VoiceAssistant from '../components/VoiceAssistant';
import FoodDetector from '../components/FoodDetector';

/**
 * DonorDashboard — Donor can add food, view their listings, and track requests.
 */
export default function DonorDashboard() {
  const { user } = useAuth();
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
          lat: user.location?.lat || 28.6139,
          lng: user.location?.lng || 77.2090,
        },
      };

      await createFood(payload);
      setAlert({ type: 'success', message: 'Food listing created successfully! 🎉' });
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

  // Approve a request
  const handleApprove = async (reqId) => {
    try {
      const { approveRequest } = await import('../api');
      await approveRequest(reqId);
      setAlert({ type: 'success', message: 'Request approved! ✅' });
      fetchData();
      setTimeout(() => setAlert(null), 3000);
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to approve request' });
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
      setAlert({ type: 'error', message: 'Failed to reject request' });
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
          <p>Welcome back, {user.name}! Manage your food donations.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Close' : '➕ Add Food'}
        </button>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>{alert.message}</div>
      )}

      {/* Add Food Form */}
      {showForm && (
        <div className="card form-card animate-slide-down">
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
                  placeholder="e.g., Cooked Meals, Bread, Fruits"
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
                  placeholder="e.g., 50 plates, 20 kg"
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
                placeholder="Describe the food, freshness, any details..."
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="expiryHours">Expiry (hours from now)</label>
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
                  <option value="48">48 hours</option>
                  <option value="72">72 hours</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="address">Pickup Address</label>
                <input
                  type="text"
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Pickup location"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary">
              🍽️ List Food
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
          🗺️ Map
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
                <h3>No food listed yet</h3>
                <p>Click "Add Food" to create your first listing!</p>
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
                <h3>No requests yet</h3>
                <p>Requests from receivers will appear here.</p>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req._id} className="request-card">
                  <div className="request-info">
                    <h4>{req.foodId?.foodType || 'Food Item'}</h4>
                    <p>Requested by: <strong>{req.receiverId?.name || 'Unknown'}</strong></p>
                    <p>📍 {req.receiverId?.location?.address || 'N/A'}</p>
                    {req.message && <p className="request-message">💬 {req.message}</p>}
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
                <h3>No deliveries yet</h3>
                <p>Active deliveries will appear here once requests are approved.</p>
              </div>
            ) : (
              deliveries.map((del) => (
                <div key={del._id} className="delivery-card">
                  <div className="delivery-info">
                    <h4>{del.foodId?.foodType || 'Food Item'}</h4>
                    <p>📍 Pickup: {del.pickupLocation?.address || 'N/A'}</p>
                    <p>📍 Drop: {del.dropLocation?.address || 'N/A'}</p>
                    {del.volunteerId && <p>🚗 Volunteer: {del.volunteerId.name}</p>}
                  </div>
                  <div className="delivery-status">
                    <div className="status-tracker">
                      <div className={`status-step ${['pending','accepted','picked','delivered'].indexOf(del.status) >= 0 ? 'active' : ''}`}>Pending</div>
                      <div className={`status-step ${['accepted','picked','delivered'].indexOf(del.status) >= 0 ? 'active' : ''}`}>Accepted</div>
                      <div className={`status-step ${['picked','delivered'].indexOf(del.status) >= 0 ? 'active' : ''}`}>Picked</div>
                      <div className={`status-step ${del.status === 'delivered' ? 'active' : ''}`}>Delivered</div>
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
          <div className="ai-tools-grid">
            <VoiceAssistant onCommand={handleVoiceCommand} />
            <FoodDetector onDetect={handleFoodDetected} />
          </div>
        )}
      </div>
    </div>
  );
}
