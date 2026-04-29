import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getDeliveries, acceptDelivery, markPicked, markDelivered } from '../api';
import MapView from '../components/MapView';

/**
 * VolunteerDashboard — Volunteer can view tasks, accept, and update delivery status.
 */
export default function VolunteerDashboard() {
  const { user, ensureGuestLogin } = useAuth();
  const { playSoftAlert, playSuccessSound, playLaunchSound } = useTheme();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available');
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      // Auto-login as guest volunteer if needed
      const loggedInUser = await ensureGuestLogin('volunteer');
      if (loggedInUser) {
        await fetchDeliveries();
      } else {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const { data } = await getDeliveries();
      setDeliveries(data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    if (!user) {
      setAlert({ type: 'error', message: 'Please login to accept tasks!' });
      setTimeout(() => setAlert(null), 3000);
      return;
    }
    try {
      if (playLaunchSound) playLaunchSound(); // Keep the sound if it exists
      await acceptDelivery(id);
      setAlert({ type: 'success', message: 'Delivery accepted! 🚗' });
      fetchDeliveries();
      setTimeout(() => setAlert(null), 3000);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to accept' });
    }
  };

  const handlePicked = async (id) => {
    try {
      await markPicked(id);
      setAlert({ type: 'success', message: 'Food picked up! 📦' });
      fetchDeliveries();
      setTimeout(() => setAlert(null), 3000);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to update' });
    }
  };

  const handleDelivered = async (id) => {
    try {
      await markDelivered(id);
      playSuccessSound();
      setAlert({ type: 'success', message: 'Food delivered successfully! 🎉' });
      fetchDeliveries();
      setTimeout(() => setAlert(null), 3000);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to update' });
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

  const availableTasks = deliveries.filter(d => d.status === 'pending');
  const myTasks = user ? deliveries.filter(d => d.volunteerId && d.volunteerId._id === user._id) : [];
  const activeTasks = myTasks.filter(d => d.status !== 'delivered');
  const completedTasks = myTasks.filter(d => d.status === 'delivered');

  // Map markers for active tasks
  const mapMarkers = [];
  activeTasks.forEach(d => {
    if (d.pickupLocation?.lat) {
      mapMarkers.push({
        lat: d.pickupLocation.lat,
        lng: d.pickupLocation.lng,
        label: `Pickup: ${d.foodId?.foodType || 'Food'}`,
        address: d.pickupLocation.address,
        type: 'pickup',
      });
    }
    if (d.dropLocation?.lat) {
      mapMarkers.push({
        lat: d.dropLocation.lat,
        lng: d.dropLocation.lng,
        label: `Drop: ${d.foodId?.foodType || 'Food'}`,
        address: d.dropLocation.address,
        type: 'drop',
      });
    }
  });

  const getActionButton = (delivery) => {
    switch (delivery.status) {
      case 'pending':
        return (
          <button className="btn btn-primary btn-sm" onClick={() => handleAccept(delivery._id)}>
            ✋ Accept Task
          </button>
        );
      case 'accepted':
        return (
          <button className="btn btn-warning btn-sm" onClick={() => handlePicked(delivery._id)}>
            📦 Mark Picked
          </button>
        );
      case 'picked':
        return (
          <button className="btn btn-success btn-sm" onClick={() => handleDelivered(delivery._id)}>
            ✅ Mark Delivered
          </button>
        );
      case 'delivered':
        return <span className="status-badge status-delivered">✅ Completed</span>;
      default:
        return null;
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>🟡 Volunteer Dashboard</h1>
          <p>Welcome{user ? `, ${user.name}` : ''}! Manage your delivery tasks.</p>
        </div>
        <button className="btn btn-primary" onClick={fetchDeliveries}>
          🔄 Refresh
        </button>
      </div>

      {alert && (
        <div className={`alert alert-${alert.type}`}>{alert.message}</div>
      )}

      {/* Stats */}
      <div className="volunteer-stats">
        <div className="stat-card mini">
          <span className="stat-icon">📋</span>
          <div>
            <h3>{availableTasks.length}</h3>
            <p>Available</p>
          </div>
        </div>
        <div className="stat-card mini">
          <span className="stat-icon">🚗</span>
          <div>
            <h3>{activeTasks.length}</h3>
            <p>Active</p>
          </div>
        </div>
        <div className="stat-card mini">
          <span className="stat-icon">✅</span>
          <div>
            <h3>{completedTasks.length}</h3>
            <p>Completed</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button className={`tab ${activeTab === 'available' ? 'active' : ''}`} onClick={() => setActiveTab('available')}>
          📋 Available ({availableTasks.length})
        </button>
        <button className={`tab ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
          🚗 My Active ({activeTasks.length})
        </button>
        <button className={`tab ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>
          ✅ Completed ({completedTasks.length})
        </button>
        <button className={`tab ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
          🗺️ Map
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'available' && (
          <div className="deliveries-list">
            {availableTasks.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📋</span>
                <h3>No tasks available</h3>
                <p>New delivery tasks will appear when receivers request food.</p>
              </div>
            ) : (
              availableTasks.map((del) => (
                <div key={del._id} className="delivery-card">
                  <div className="delivery-info">
                    <h4>{del.foodId?.foodType || 'Food Item'}</h4>
                    <p>📍 Pickup: {del.pickupLocation?.address || 'N/A'}</p>
                    <p>📍 Drop: {del.dropLocation?.address || 'N/A'}</p>
                    {del.foodId?.donorId && <p>👤 Donor: {del.foodId.donorId.name}</p>}
                  </div>
                  <div className="delivery-actions">
                    {getActionButton(del)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'active' && (
          <div className="deliveries-list">
            {activeTasks.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🚗</span>
                <h3>No active tasks</h3>
                <p>Accept a task from the "Available" tab to get started!</p>
              </div>
            ) : (
              activeTasks.map((del) => (
                <div key={del._id} className="delivery-card active-delivery">
                  <div className="delivery-info">
                    <h4>{del.foodId?.foodType || 'Food Item'}</h4>
                    <p>📍 Pickup: {del.pickupLocation?.address || 'N/A'}</p>
                    <p>📍 Drop: {del.dropLocation?.address || 'N/A'}</p>
                    {del.foodId?.donorId && (
                      <p>👤 Donor: {del.foodId.donorId.name} • 📞 {del.foodId.donorId.phone}</p>
                    )}
                  </div>
                  <div className="delivery-status">
                    <div className="status-tracker">
                      <div className={`status-step ${['pending','accepted','picked','delivered'].indexOf(del.status) >= 0 ? 'active' : ''}`}>Pending</div>
                      <div className={`status-step ${['accepted','picked','delivered'].indexOf(del.status) >= 0 ? 'active' : ''}`}>Accepted</div>
                      <div className={`status-step ${['picked','delivered'].indexOf(del.status) >= 0 ? 'active' : ''}`}>Picked</div>
                      <div className={`status-step ${del.status === 'delivered' ? 'active' : ''}`}>Delivered</div>
                    </div>
                    <div className="delivery-actions" style={{ marginTop: '1rem' }}>
                      {getActionButton(del)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'completed' && (
          <div className="deliveries-list">
            {completedTasks.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">✅</span>
                <h3>No completed deliveries</h3>
                <p>Your completed deliveries will show up here.</p>
              </div>
            ) : (
              completedTasks.map((del) => (
                <div key={del._id} className="delivery-card completed-delivery">
                  <div className="delivery-info">
                    <h4>{del.foodId?.foodType || 'Food Item'}</h4>
                    <p>📍 Pickup: {del.pickupLocation?.address || 'N/A'}</p>
                    <p>📍 Drop: {del.dropLocation?.address || 'N/A'}</p>
                  </div>
                  <span className="status-badge status-delivered">✅ Delivered</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'map' && (
          <div>
            <h3 style={{ margin: '0 0 1rem 0' }}>📍 Pickup (Green) & Drop (Red) Locations</h3>
            <MapView markers={mapMarkers} />
          </div>
        )}
      </div>
    </div>
  );
}
