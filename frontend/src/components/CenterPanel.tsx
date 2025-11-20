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
}

export default function CenterPanel({ activeView }: CenterPanelProps) {
  const renderView = () => {
    switch (activeView) {
      case 'assistant':
        return (
          <>
            <VoiceOrb />
            <ChatInterface />
          </>
        );
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
        return (
          <>
            <VoiceOrb />
            <ChatInterface />
          </>
        );
    }
  };

  return <div className="center-panel">{renderView()}</div>;
}

