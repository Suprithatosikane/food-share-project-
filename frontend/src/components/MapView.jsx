import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon issue with Leaflet + bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom colored markers
const createIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const icons = {
  pickup: createIcon('green'),
  drop: createIcon('red'),
  default: createIcon('blue'),
};

/**
 * MapView — Displays a Leaflet map with markers for locations.
 * @param {Array} markers - Array of { lat, lng, label, type } objects
 * @param {Number} zoom - Initial zoom level (default: 13)
 */
export default function MapView({ markers = [], zoom = 13 }) {
  // Calculate center from markers, or default to New Delhi
  const center = markers.length > 0
    ? [
        markers.reduce((sum, m) => sum + (m.lat || 0), 0) / markers.length,
        markers.reduce((sum, m) => sum + (m.lng || 0), 0) / markers.length,
      ]
    : [28.6139, 77.2090];

  // Filter out markers with invalid coordinates
  const validMarkers = markers.filter(m => m.lat && m.lng && m.lat !== 0 && m.lng !== 0);

  if (validMarkers.length === 0) {
    return (
      <div className="map-placeholder">
        <span className="map-icon">🗺️</span>
        <p>No location data available</p>
      </div>
    );
  }

  return (
    <div className="map-container">
      <MapContainer center={center} zoom={zoom} style={{ height: '300px', width: '100%', borderRadius: '12px' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validMarkers.map((marker, index) => (
          <Marker
            key={index}
            position={[marker.lat, marker.lng]}
            icon={icons[marker.type] || icons.default}
          >
            <Popup>
              <strong>{marker.label || 'Location'}</strong>
              {marker.address && <br />}
              {marker.address}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
