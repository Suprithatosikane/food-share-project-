/**
 * FoodCard — Reusable card component for displaying a food listing.
 * Shows food details and an optional action button.
 */
export default function FoodCard({ food, actionLabel, onAction, showDonor = false, statusBadge = true }) {
  // Format the expiry time
  const formatExpiry = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = d - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (diff < 0) return 'Expired';
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const getStatusColor = (status) => {
    const colors = {
      available: '#22c55e',
      requested: '#f59e0b',
      picked: '#3b82f6',
      delivered: '#8b5cf6',
    };
    return colors[status] || '#6b7280';
  };

  const isExpired = new Date(food.expiryTime) < new Date();

  return (
    <div className={`food-card ${isExpired ? 'expired' : ''}`}>
      <div className="food-card-header">
        <div className="food-type-icon">
          {food.foodType?.toLowerCase().includes('fruit') ? '🍎' :
           food.foodType?.toLowerCase().includes('bread') ? '🍞' :
           food.foodType?.toLowerCase().includes('meal') ? '🍛' :
           food.foodType?.toLowerCase().includes('snack') ? '🍪' :
           food.foodType?.toLowerCase().includes('veg') ? '🥬' : '🍱'}
        </div>
        {statusBadge && (
          <span
            className="status-badge"
            style={{ backgroundColor: getStatusColor(food.status) }}
          >
            {food.status}
          </span>
        )}
      </div>

      <div className="food-card-body">
        <h3 className="food-title">{food.foodType}</h3>
        <p className="food-description">{food.description}</p>

        <div className="food-meta">
          <div className="meta-item">
            <span className="meta-icon">📦</span>
            <span>{food.quantity}</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon">⏰</span>
            <span className={isExpired ? 'text-danger' : ''}>{formatExpiry(food.expiryTime)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon">📍</span>
            <span>{food.location?.address || 'Unknown location'}</span>
          </div>
        </div>

        {showDonor && food.donorId && (
          <div className="donor-info">
            <span className="meta-icon">👤</span>
            <span>{food.donorId.name}</span>
            {food.donorId.phone && <span> • {food.donorId.phone}</span>}
          </div>
        )}
      </div>

      {actionLabel && onAction && !isExpired && (
        <div className="food-card-actions">
          <button className="btn btn-primary" onClick={() => onAction(food)}>
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
