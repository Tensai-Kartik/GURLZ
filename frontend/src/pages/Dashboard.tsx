import { useState } from 'react';
import LeftNav from '../components/LeftNav';
import CenterPanel from '../components/CenterPanel';
import RightPanel from '../components/RightPanel';
import AskAIModal from '../components/AskAIModal';
import './Dashboard.css';

export default function Dashboard() {
  const [activeView, setActiveView] = useState('dashboard');
  const [showAskAIModal, setShowAskAIModal] = useState(false);

  return (
    <div className="dashboard-container">
      <LeftNav
        activeView={activeView}
        setActiveView={setActiveView}
        openAskAI={() => setShowAskAIModal(true)}
      />
      <CenterPanel
        activeView={activeView}
        setActiveView={setActiveView}
        openAskAI={() => setShowAskAIModal(true)}
      />
      <RightPanel />

      {showAskAIModal && (
        <AskAIModal onClose={() => setShowAskAIModal(false)} />
      )}
    </div>
  );
}
