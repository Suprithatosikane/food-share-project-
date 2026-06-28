import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * SmartNotification — Intelligent AI notification system.
 * Shows context-aware notifications based on user role and location.
 * Only relevant nearby users get notified (not spam to everyone).
 */
export default function SmartNotification({ userRole }) {
  const { playSoftAlert } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Simulate AI-filtered notifications based on role
  useEffect(() => {
    const roleNotifications = getSmartNotifications(userRole);
    setNotifications(roleNotifications);
    setUnreadCount(roleNotifications.filter(n => !n.read).length);
  }, [userRole]);

  const getSmartNotifications = (role) => {
    const now = new Date();
    const base = [
      {
        id: 1, type: 'ai_match', read: false,
        title: '🤖 AI Smart Match',
        message: 'AI found 3 food donations within 2km of your location',
        time: new Date(now - 120000).toLocaleTimeString(),
        relevance: 98, roles: ['receiver'],
      },
      {
        id: 2, type: 'new_food', read: false,
        title: '🍛 New Food Available',
        message: 'Hotel Udupi Grand listed 50 meals of Biryani — 1.5km away',
        time: new Date(now - 300000).toLocaleTimeString(),
        relevance: 95, roles: ['receiver', 'volunteer'],
      },
      {
        id: 3, type: 'urgent', read: false,
        title: '⚡ Urgent: Food Expiring Soon',
        message: '30 meals expiring in 2 hours at Central Mall — needs immediate pickup!',
        time: new Date(now - 600000).toLocaleTimeString(),
        relevance: 99, roles: ['volunteer', 'receiver'],
      },
      {
        id: 4, type: 'request', read: true,
        title: '📨 New Request Received',
        message: 'BTM NGO Kitchen requested your rice donation — 2.3km away',
        time: new Date(now - 900000).toLocaleTimeString(),
        relevance: 92, roles: ['donor'],
      },
      {
        id: 5, type: 'delivery', read: true,
        title: '🚗 Delivery Task Available',
        message: 'Pickup: MG Road → Drop: Jayanagar — 3.5km route — AI assigned to you',
        time: new Date(now - 1200000).toLocaleTimeString(),
        relevance: 97, roles: ['volunteer'],
      },
      {
        id: 6, type: 'ai_freshness', read: false,
        title: '✅ AI Freshness Check Passed',
        message: 'Your donated Chapathi & Dal scored 92% freshness — approved for distribution',
        time: new Date(now - 1500000).toLocaleTimeString(),
        relevance: 90, roles: ['donor'],
      },
      {
        id: 7, type: 'impact', read: true,
        title: '🎉 Impact Update',
        message: 'Your donations helped feed 150 people this week! Thank you 💚',
        time: new Date(now - 1800000).toLocaleTimeString(),
        relevance: 85, roles: ['donor'],
      },
      {
        id: 8, type: 'nearby', read: false,
        title: '📍 Nearby Alert',
        message: 'New food center opened in HSR Layout — 1.2km from you',
        time: new Date(now - 2400000).toLocaleTimeString(),
        relevance: 80, roles: ['receiver', 'volunteer', 'donor'],
      },
    ];

    // AI filtering: only show notifications relevant to user's role
    return base
      .filter(n => !role || n.roles.includes(role))
      .sort((a, b) => b.relevance - a.relevance);
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      playSoftAlert();
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      ai_match: '#8b5cf6',
      new_food: '#16a34a',
      urgent: '#ef4444',
      request: '#3b82f6',
      delivery: '#f59e0b',
      ai_freshness: '#22c55e',
      impact: '#ec4899',
      nearby: '#14b8a6',
    };
    return colors[type] || '#6b7280';
  };

  return (
    <div className="smart-notif-container">
      <button className="smart-notif-btn" onClick={handleToggle}>
        🔔
        {unreadCount > 0 && (
          <span className="smart-notif-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="smart-notif-panel">
          <div className="smart-notif-header">
            <h3>🤖 Smart Notifications</h3>
            <div className="smart-notif-actions">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="smart-notif-mark">
                  Mark all read
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="smart-notif-close">✕</button>
            </div>
          </div>

          <div className="smart-notif-ai-note">
            <span>🧠</span> AI shows only notifications relevant to you & your location
          </div>

          <div className="smart-notif-list">
            {notifications.map(n => (
              <div
                key={n.id}
                className={`smart-notif-item ${n.read ? '' : 'unread'}`}
              >
                <span
                  className="smart-notif-dot"
                  style={{ background: getTypeColor(n.type) }}
                ></span>
                <div className="smart-notif-content">
                  <strong>{n.title}</strong>
                  <p>{n.message}</p>
                  <div className="smart-notif-meta">
                    <span className="smart-notif-time">{n.time}</span>
                    <span className="smart-notif-relevance">
                      🎯 {n.relevance}% match
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
