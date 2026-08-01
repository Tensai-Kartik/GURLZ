import { useAuthStore } from '../store/authStore';
import './LeftNav.css';

interface LeftNavProps {
  activeView: string;
  setActiveView: (view: string) => void;
  openAskAI: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function LeftNav({
  activeView,
  setActiveView,
  openAskAI,
  isOpen = false,
  onClose,
}: LeftNavProps) {
  const { user, logout } = useAuthStore();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'assistant', label: 'AI Companion', icon: '🔮' },
    { id: 'comfort', label: 'Comfort Mode', icon: '🕯️' },
    { id: 'cycle', label: 'Cycle Tracker', icon: '📅' },
    { id: 'food', label: 'Food & Cravings', icon: '🍫' },
    { id: 'pads', label: 'Pads & Medicine', icon: '💊' },
    { id: 'music', label: 'Music', icon: '🎵' },
    { id: 'diary', label: 'Personal Diary', icon: '📔' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const handleSelectNav = (id: string) => {
    setActiveView(id);
    onClose?.();
  };

  return (
    <nav className={`left-nav ${isOpen ? 'open' : ''}`}>
      <div className="nav-header">
        {onClose && (
          <button className="drawer-close-btn left" onClick={onClose} title="Close Menu">
            ✕
          </button>
        )}
        <div className="nav-logo">
          <img src="/gurlz-logo.jpg" alt="GURLZ" className="nav-logo-img" />
        </div>
        <h2>GURLZ</h2>
        <p className="nav-subtitle">WELLNESS AI</p>
      </div>

      <div className="ask-ai-nav-banner">
        <button
          className="ask-ai-quick-btn"
          onClick={() => {
            openAskAI();
            onClose?.();
          }}
        >
          ✨ Ask GURLZ AI
        </button>
      </div>

      <div className="nav-items">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => handleSelectNav(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="nav-footer">
        <div className="user-info">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" className="user-avatar-img" />
          ) : (
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
          )}
          <div className="user-details">
            <span className="user-name">{user?.name || 'User'}</span>
            <span className="user-email">{user?.email || ''}</span>
          </div>
        </div>
        <button
          className="logout-button"
          onClick={() => {
            logout();
            onClose?.();
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
