import DashboardView from './DashboardView';
import ComfortMode from './ComfortMode';
import VoiceOrb from './VoiceOrb';
import ChatInterface from './ChatInterface';
import CycleTracker from './CycleTracker';
import FoodCravings from './FoodCravings';
import PadsMedicine from './PadsMedicine';
import MusicPanel from './MusicPanel';
import DiaryPanel from './DiaryPanel';
import SettingsPanel from './SettingsPanel';
import './CenterPanel.css';

interface CenterPanelProps {
  activeView: string;
  setActiveView: (view: string) => void;
  openAskAI: () => void;
}

export default function CenterPanel({ activeView, setActiveView, openAskAI }: CenterPanelProps) {
  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView setActiveView={setActiveView} openAskAI={openAskAI} />;
      case 'assistant':
        return (
          <div className="ai-companion-view">
            <VoiceOrb />
            <ChatInterface />
          </div>
        );
      case 'comfort':
        return <ComfortMode />;
      case 'cycle':
        return <CycleTracker />;
      case 'food':
        return <FoodCravings />;
      case 'pads':
        return <PadsMedicine />;
      case 'music':
        return <MusicPanel />;
      case 'diary':
        return <DiaryPanel />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <DashboardView setActiveView={setActiveView} openAskAI={openAskAI} />;
    }
  };

  return (
    <div className={`center-panel ${activeView === 'assistant' ? 'is-ai-view' : ''}`}>
      {renderView()}
    </div>
  );
}
