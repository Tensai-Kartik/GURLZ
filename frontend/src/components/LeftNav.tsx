import { useAuthStore } from '../store/authStore';
import './LeftNav.css';

interface LeftNavProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export default function LeftNav({ activeView, setActiveView }: LeftNavProps) {
  const { user, logout } = useAuthStore();

  const navItems = [
    { id: 'assistant', label: 'Assistant', icon: '💬' },
    { id: 'cycle', label: 'Cycle Tracker', icon: '📅' },
    { id: 'food', label: 'Food & Cravings', icon: '🍫' },
    { id: 'pads', label: 'Pads & Medicine', icon: '💊' },
    { id: 'music', label: 'Music', icon: '🎵' },
    { id: 'diary', label: 'Personal Diary', icon: '📔' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <nav className="left-nav">
      <div className="nav-header">
        <div className="nav-logo">
          <div className="nav-logo-orb"></div>
        </div>
        <h2>GURLZ</h2>
        <p className="nav-subtitle">WELLNESS AI</p>
      </div>

      <div className="nav-items">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => setActiveView(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="nav-footer">
        <div className="user-info">
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
          <span className="user-name">{user?.name || 'User'}</span>
        </div>
        <button className="logout-button" onClick={logout}>
          Logout
        </button>
      </div>
    </nav>
  );
}

