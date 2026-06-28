import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getFoods, createRequest, getRequests, getDeliveries, updateDailyRequirement } from '../api';
import FoodCard from '../components/FoodCard';
import MapView from '../components/MapView';

/**
 * ReceiverDashboard — Receiver can view available food, request it, track deliveries, and manage daily food requirements.
 */
export default function ReceiverDashboard() {
  const { user, ensureGuestLogin, loginUser } = useAuth();
  const { playSoftAlert, playSuccessSound } = useTheme();
  const [foods, setFoods] = useState([]);
  const [requests, setRequests] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [alert, setAlert] = useState(null);

  // Partial Request Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [requestQty, setRequestQty] = useState('');
  const [requestMsg, setRequestMsg] = useState('');

  // Daily Food Requirement Settings State
  const [dailyEnabled, setDailyEnabled] = useState(false);
  const [dailyQty, setDailyQty] = useState(0);
  const [dailyTime, setDailyTime] = useState('12:00');
  const [dailyMealType, setDailyMealType] = useState('');

  useEffect(() => {
    const loadData = async () => {
      // Auto-login as guest receiver if needed
      const loggedInUser = await ensureGuestLogin('receiver');
      if (loggedInUser) {
        await fetchData();
      } else {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Sync daily requirement states when user data is loaded/updated
  useEffect(() => {
    if (user?.dailyRequirement) {
      setDailyEnabled(user.dailyRequirement.enabled || false);
      setDailyQty(user.dailyRequirement.quantity || 0);
      setDailyTime(user.dailyRequirement.preferredTime || '12:00');
      setDailyMealType(user.dailyRequirement.mealType || '');
    }
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
      // Play soft alert if new food is available
      if (foodRes.data.length > 0) playSoftAlert();
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestClick = (food) => {
    setSelectedFood(food);
    // Auto-fill available numeric quantity
    const match = food.quantity ? food.quantity.trim().match(/^([\d.]+)/) : null;
    const qtyVal = match ? match[1] : '';
    setRequestQty(qtyVal);
    setRequestMsg('');
    setShowRequestModal(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setAlert({ type: 'error', message: 'Please login to request food!' });
      setTimeout(() => setAlert(null), 3000);
      return;
    }
    if (!selectedFood) return;

    const availableMatch = selectedFood.quantity ? selectedFood.quantity.trim().match(/^([\d.]+)/) : null;
    const availableVal = availableMatch ? parseFloat(availableMatch[1]) : 0;
    const requestedVal = parseFloat(requestQty);

    if (isNaN(requestedVal) || requestedVal <= 0) {
      setAlert({ type: 'error', message: 'Please enter a valid requested quantity greater than 0.' });
      return;
    }

    if (requestedVal > availableVal) {
      setAlert({ type: 'error', message: `Requested quantity cannot exceed available quantity (${selectedFood.quantity}).` });
      return;
    }

    try {
      await createRequest({
        foodId: selectedFood._id,
        message: requestMsg || `Request from ${user.name}`,
        requestedQuantity: requestQty,
      });
      playSuccessSound();
      setAlert({ type: 'success', message: 'Food requested successfully! 🎉' });
      setShowRequestModal(false);
      setSelectedFood(null);
      fetchData();
      setTimeout(() => setAlert(null), 3000);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to request food' });
      setTimeout(() => setAlert(null), 3000);
    }
  };

  const handleSaveDailyPreferences = async (e) => {
    e.preventDefault();
    try {
      const res = await updateDailyRequirement({
        enabled: dailyEnabled,
        quantity: parseInt(dailyQty) || 0,
        preferredTime: dailyTime,
        mealType: dailyMealType,
      });

      // Update the user state globally in the application
      loginUser({
        ...user,
        dailyRequirement: res.data.dailyRequirement,
      });

      setAlert({ type: 'success', message: 'Daily food requirement preferences saved! ⏰' });
      setTimeout(() => setAlert(null), 3000);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to update preferences' });
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
        <button className={`tab ${activeTab === 'daily' ? 'active' : ''}`} onClick={() => setActiveTab('daily')}>
          ⏰ Daily Settings
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
                  onAction={handleRequestClick}
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
                    <p>📦 Quantity Requested: {req.requestedQuantity || req.foodId?.quantity}</p>
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
                    <h4>{del.foodId?.foodType || 'Food Item'} ({del.requestedQuantity || del.foodId?.quantity})</h4>
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

        {activeTab === 'daily' && (
          <div className="card form-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h3>⏰ Daily Food Requirement Settings</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Configure your recurring daily food requirements. The system will automatically broadcast 
              your requirements to nearby donors at your preferred time every day.
            </p>

            <form onSubmit={handleSaveDailyPreferences} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  id="dailyEnabled"
                  checked={dailyEnabled}
                  onChange={(e) => setDailyEnabled(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <label htmlFor="dailyEnabled" style={{ fontWeight: 600, fontSize: '1rem', cursor: 'pointer', margin: 0 }}>
                  Enable Recurring Daily Requirement
                </label>
              </div>

              {dailyEnabled && (
                <>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label htmlFor="dailyQty" style={{ fontWeight: 600 }}>Daily Meal Quantity (meals)</label>
                      <input
                        type="number"
                        id="dailyQty"
                        value={dailyQty}
                        onChange={(e) => setDailyQty(e.target.value)}
                        placeholder="e.g. 20"
                        min="1"
                        required={dailyEnabled}
                      />
                    </div>

                    <div className="form-group" style={{ flex: 1 }}>
                      <label htmlFor="dailyTime" style={{ fontWeight: 600 }}>Preferred Request Time</label>
                      <input
                        type="time"
                        id="dailyTime"
                        value={dailyTime}
                        onChange={(e) => setDailyTime(e.target.value)}
                        required={dailyEnabled}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="dailyMealType" style={{ fontWeight: 600 }}>Meal Type Preference (Optional)</label>
                    <input
                      type="text"
                      id="dailyMealType"
                      value={dailyMealType}
                      onChange={(e) => setDailyMealType(e.target.value)}
                      placeholder="e.g. Rice & Sambar, Veg meals"
                    />
                    <small style={{ color: '#888' }}>
                      Eligible donors will see this, but can fulfill it with any type.
                    </small>
                  </div>
                </>
              )}

              <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '0.5rem' }}>
                💾 Save Recurring Preferences
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Partial Food Request Modal */}
      {showRequestModal && selectedFood && (
        <div className="auth-modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <button className="auth-modal-close" onClick={() => setShowRequestModal(false)}>✕</button>
            <div className="auth-modal-header">
              <span className="auth-modal-icon">🙏</span>
              <h2>Request Food Portion</h2>
              <p>Select how much of this donation you need</p>
            </div>
            
            <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#1e293b' }}>
              <div style={{ marginBottom: '0.5rem' }}><strong>Food Item:</strong> {selectedFood.foodType}</div>
              <div style={{ marginBottom: '0.5rem' }}><strong>Available:</strong> {selectedFood.quantity}</div>
              {selectedFood.description && <div><strong>Description:</strong> {selectedFood.description}</div>}
            </div>

            <form onSubmit={handleModalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="modalRequestQty" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Requested Quantity</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    id="modalRequestQty"
                    value={requestQty}
                    onChange={(e) => setRequestQty(e.target.value)}
                    placeholder="e.g. 10"
                    min="0.01"
                    step="any"
                    required
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {selectedFood.quantity?.replace(/^[\d.]+\s*/, '') || 'units'}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="modalRequestMsg" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Notes / Message (Optional)</label>
                <textarea
                  id="modalRequestMsg"
                  value={requestMsg}
                  onChange={(e) => setRequestMsg(e.target.value)}
                  placeholder="Any delivery instructions, special requirements, etc."
                  rows={3}
                />
              </div>

              <button type="submit" className="eco-btn eco-btn-primary eco-btn-full" style={{ marginTop: '0.5rem' }}>
                Confirm & Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
