import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { getFoods, getDeliveries } from '../api';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const icons = {
  donation: createIcon('green'),
  volunteer: createIcon('orange'),
  center: createIcon('blue'),
  pickup: createIcon('green'),
  drop: createIcon('red'),
};

// Realistic demo data for Bangalore area
const demoDonations = [
  { id: 1, lat: 12.9716, lng: 77.5946, label: 'Hotel Udupi Grand', address: 'MG Road, Bangalore', food: 'Rice & Sambar', qty: '50 servings', time: '2h ago' },
  { id: 2, lat: 12.9352, lng: 77.6245, label: 'Taj Restaurant', address: 'Koramangala, Bangalore', food: 'Biryani', qty: '30 servings', time: '1h ago' },
  { id: 3, lat: 12.9698, lng: 77.7500, label: 'IT Park Cafeteria', address: 'Whitefield, Bangalore', food: 'Mixed Meals', qty: '100 servings', time: '30m ago' },
  { id: 4, lat: 12.9796, lng: 77.5909, label: 'Central Mall Food Court', address: 'Brigade Road, Bangalore', food: 'Chapathi & Dal', qty: '40 servings', time: '45m ago' },
  { id: 5, lat: 13.0358, lng: 77.5970, label: 'Vidyarthi Bhavan', address: 'Yeshwanthpur, Bangalore', food: 'Dosa & Chutney', qty: '60 servings', time: '15m ago' },
  { id: 6, lat: 12.9141, lng: 77.6411, label: 'Wedding Hall', address: 'HSR Layout, Bangalore', food: 'Full Meal', qty: '200 servings', time: '10m ago' },
];

const demoVolunteers = [
  { id: 1, lat: 12.9556, lng: 77.6045, label: 'Ravi K.', status: 'Delivering', from: 'MG Road', to: 'Jayanagar', route: [[12.9716, 77.5946], [12.9556, 77.6045], [12.9250, 77.5838]] },
  { id: 2, lat: 12.9450, lng: 77.6350, label: 'Priya S.', status: 'Picking up', from: 'Koramangala', to: 'BTM Layout', route: [[12.9352, 77.6245], [12.9450, 77.6350], [12.9166, 77.6101]] },
  { id: 3, lat: 13.0100, lng: 77.5600, label: 'Arun M.', status: 'En route', from: 'Yeshwanthpur', to: 'Malleswaram', route: [[13.0358, 77.5970], [13.0100, 77.5600], [12.9966, 77.5713]] },
];

const demoCenters = [
  { id: 1, lat: 12.9250, lng: 77.5838, label: 'Jayanagar Community Center', address: 'Jayanagar, Bangalore', capacity: '500 meals/day' },
  { id: 2, lat: 12.9166, lng: 77.6101, label: 'BTM NGO Kitchen', address: 'BTM Layout, Bangalore', capacity: '300 meals/day' },
  { id: 3, lat: 12.9966, lng: 77.5713, label: 'Malleswaram Food Bank', address: 'Malleswaram, Bangalore', capacity: '400 meals/day' },
  { id: 4, lat: 12.9560, lng: 77.5364, label: 'RR Nagar Shelter', address: 'RR Nagar, Bangalore', capacity: '200 meals/day' },
];

/**
 * LiveMapPage — Full interactive live map showing food donations, volunteer routes,
 * and distribution centers with filtering and real-time simulation.
 */
export default function LiveMapPage() {
  const { t } = useLanguage();
  const { ensureGuestLogin } = useAuth();
  const [filter, setFilter] = useState('all');
  const [foods, setFoods] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [pulseKey, setPulseKey] = useState(0);

  // Try to load real data, fall back to demo data
  useEffect(() => {
    const init = async () => {
      await ensureGuestLogin('receiver'); // Use receiver role as a general viewer
      loadData();
    };
    init();
    
    // Simulate live updates with pulse effect
    const interval = setInterval(() => {
      setPulseKey(k => k + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [foodRes, delRes] = await Promise.all([getFoods(), getDeliveries()]);
      setFoods(foodRes.data || []);
      setDeliveries(delRes.data || []);
    } catch {
      // Use demo data if backend isn't running
      setFoods([]);
      setDeliveries([]);
    }
  };

  // Merge real + demo data
  const allDonations = [
    ...demoDonations,
    ...foods.filter(f => f.location?.lat).map((f, i) => ({
      id: `real-${i}`,
      lat: f.location.lat,
      lng: f.location.lng,
      label: f.foodType,
      address: f.location.address,
      food: f.foodType,
      qty: f.quantity,
      time: 'Live',
    })),
  ];

  const allVolunteers = [
    ...demoVolunteers,
    ...deliveries.filter(d => d.volunteerId && d.pickupLocation?.lat).map((d, i) => ({
      id: `real-vol-${i}`,
      lat: d.pickupLocation.lat,
      lng: d.pickupLocation.lng,
      label: d.volunteerId.name || 'Volunteer',
      status: d.status,
      from: d.pickupLocation.address,
      to: d.dropLocation?.address,
      route: d.dropLocation?.lat ? [[d.pickupLocation.lat, d.pickupLocation.lng], [d.dropLocation.lat, d.dropLocation.lng]] : [],
    })),
  ];

  const stats = {
    donations: allDonations.length,
    volunteers: allVolunteers.length,
    completed: deliveries.filter(d => d.status === 'delivered').length + 47,
  };

  const filters = [
    { key: 'all', label: t('filterAll'), icon: '🌐' },
    { key: 'donations', label: t('filterDonations'), icon: '🍱' },
    { key: 'volunteers', label: t('filterVolunteers'), icon: '🚗' },
    { key: 'centers', label: t('filterCenters'), icon: '🏢' },
  ];

  return (
    <div className="livemap-page">
      <div className="livemap-header">
        <div>
          <h1 className="livemap-title">
            <span className="livemap-pulse" key={pulseKey}></span>
            🗺️ {t('liveMapPageTitle')}
          </h1>
          <p className="livemap-subtitle">{t('liveMapPageSubtitle')}</p>
        </div>

        {/* Live Stats */}
        <div className="livemap-stats">
          <div className="livemap-stat">
            <span className="livemap-stat-num">{stats.donations}</span>
            <span className="livemap-stat-label">{t('activeDonations')}</span>
          </div>
          <div className="livemap-stat">
            <span className="livemap-stat-num">{stats.volunteers}</span>
            <span className="livemap-stat-label">{t('activeVolunteers')}</span>
          </div>
          <div className="livemap-stat">
            <span className="livemap-stat-num">{stats.completed}</span>
            <span className="livemap-stat-label">{t('deliveriesCompleted')}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="livemap-filters">
        {filters.map(f => (
          <button
            key={f.key}
            className={`livemap-filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="livemap-container">
        <MapContainer
          center={[12.9716, 77.5946]}
          zoom={12}
          style={{ height: '500px', width: '100%', borderRadius: '16px' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Donation Markers */}
          {(filter === 'all' || filter === 'donations') && allDonations.map((d) => (
            <Marker key={`don-${d.id}`} position={[d.lat, d.lng]} icon={icons.donation}>
              <Popup>
                <div style={{ minWidth: '180px' }}>
                  <strong>🍱 {d.label}</strong><br />
                  <span style={{ color: '#666' }}>{d.address}</span><br />
                  <span>📦 {d.food} — {d.qty}</span><br />
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>⏰ {d.time}</span>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Volunteer Markers + Routes */}
          {(filter === 'all' || filter === 'volunteers') && allVolunteers.map((v) => (
            <div key={`vol-${v.id}`}>
              <Marker position={[v.lat, v.lng]} icon={icons.volunteer}>
                <Popup>
                  <div style={{ minWidth: '180px' }}>
                    <strong>🚗 {v.label}</strong><br />
                    <span style={{ color: '#f59e0b', fontWeight: 600 }}>Status: {v.status}</span><br />
                    <span>📍 {v.from} → {v.to}</span>
                  </div>
                </Popup>
              </Marker>
              {v.route && v.route.length > 1 && (
                <Polyline
                  positions={v.route}
                  color="#f59e0b"
                  weight={3}
                  dashArray="10 6"
                  opacity={0.8}
                />
              )}
            </div>
          ))}

          {/* Distribution Center Markers */}
          {(filter === 'all' || filter === 'centers') && demoCenters.map((c) => (
            <Marker key={`ctr-${c.id}`} position={[c.lat, c.lng]} icon={icons.center}>
              <Popup>
                <div style={{ minWidth: '180px' }}>
                  <strong>🏢 {c.label}</strong><br />
                  <span style={{ color: '#666' }}>{c.address}</span><br />
                  <span style={{ color: '#3b82f6', fontWeight: 600 }}>Capacity: {c.capacity}</span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="livemap-legend">
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#16a34a' }}></span>
          {t('legendDonation')}
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#f59e0b' }}></span>
          {t('legendVolunteer')}
        </div>
        <div className="legend-item">
          <span className="legend-dot" style={{ background: '#3b82f6' }}></span>
          {t('legendCenter')}
        </div>
        <div className="legend-item">
          <span className="legend-line"></span>
          Delivery Route
        </div>
      </div>
    </div>
  );
}
