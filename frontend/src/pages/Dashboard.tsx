import { useState } from 'react';
import LeftNav from '../components/LeftNav';
import CenterPanel from '../components/CenterPanel';
import RightPanel from '../components/RightPanel';
import { useAuthStore } from '../store/authStore';
import './Dashboard.css';

export default function Dashboard() {
  const [activeView, setActiveView] = useState('assistant');
  const { user } = useAuthStore();

  return (
    <div className="dashboard-container">
      <LeftNav activeView={activeView} setActiveView={setActiveView} />
      <CenterPanel activeView={activeView} />
      <RightPanel />
    </div>
  );
}

