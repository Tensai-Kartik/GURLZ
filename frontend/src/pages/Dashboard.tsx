import { useState } from 'react';
import LeftNav from '../components/LeftNav';
import CenterPanel from '../components/CenterPanel';
import RightPanel from '../components/RightPanel';
import AskAIModal from '../components/AskAIModal';
import './Dashboard.css';

export default function Dashboard() {
  const [activeView, setActiveView] = useState('dashboard');
  const [showAskAIModal, setShowAskAIModal] = useState(false);
  const [isLeftNavOpen, setIsLeftNavOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);

  const closeDrawers = () => {
    setIsLeftNavOpen(false);
    setIsRightPanelOpen(false);
  };

  return (
    <div className={`dashboard-container ${activeView === 'assistant' ? 'is-ai-view-active' : ''}`}>
      {/* Mobile & Tablet Header Navigation Bar */}
      <header className="mobile-header-bar">
        <button
          className="mobile-toggle-btn left-toggle"
          onClick={() => {
            setIsLeftNavOpen(!isLeftNavOpen);
            setIsRightPanelOpen(false);
          }}
          title="Open Menu"
        >
          <span className="btn-icon">☰</span>
          <span className="btn-text">Menu</span>
        </button>

        <div className="mobile-brand-title" onClick={() => setActiveView('dashboard')}>
          <img src="/gurlz-logo.jpg" alt="GURLZ" className="mobile-brand-logo" />
          <span className="brand-text">GURLZ</span>
        </div>

        <button
          className="mobile-toggle-btn right-toggle"
          onClick={() => {
            setIsRightPanelOpen(!isRightPanelOpen);
            setIsLeftNavOpen(false);
          }}
          title="Open Emergency & Info"
        >
          <span className="btn-icon">🚨</span>
          <span className="btn-text">Info & SOS</span>
        </button>
      </header>

      {/* Backdrop for Mobile/Tablet Drawers */}
      {(isLeftNavOpen || isRightPanelOpen) && (
        <div className="mobile-overlay-backdrop" onClick={closeDrawers} />
      )}

      {/* Left Navigation Sidebar */}
      <LeftNav
        activeView={activeView}
        setActiveView={setActiveView}
        openAskAI={() => setShowAskAIModal(true)}
        isOpen={isLeftNavOpen}
        onClose={() => setIsLeftNavOpen(false)}
      />

      {/* Center Content Workspace */}
      <CenterPanel
        activeView={activeView}
        setActiveView={setActiveView}
        openAskAI={() => setShowAskAIModal(true)}
      />

      {/* Right Side Emergency & Quick Info Panel */}
      <RightPanel
        isOpen={isRightPanelOpen}
        onClose={() => setIsRightPanelOpen(false)}
      />

      {/* Ask GURLZ AI Modal */}
      {showAskAIModal && (
        <AskAIModal onClose={() => setShowAskAIModal(false)} />
      )}
    </div>
  );
}
