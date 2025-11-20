import { useState } from 'react';
import './SettingsPanel.css';

export default function SettingsPanel() {
  const [geminiKeys, setGeminiKeys] = useState('');

  const handleSaveKeys = () => {
    // In production, this would send to backend
    alert('Gemini keys saved! (This is a demo)');
  };

  return (
    <div className="settings-panel">
      <h2 className="view-title">Settings</h2>
      <div className="settings-content">
        <div className="settings-section">
          <h3 className="settings-section-title">Gemini API Keys</h3>
          <p className="settings-description">
            Add multiple API keys for rotation and failover. Separate keys with commas.
          </p>
          <textarea
            className="settings-textarea"
            placeholder="key1,key2,key3"
            value={geminiKeys}
            onChange={(e) => setGeminiKeys(e.target.value)}
            rows={3}
          />
          <button className="settings-save-button" onClick={handleSaveKeys}>
            Save Keys
          </button>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">Theme</h3>
          <div className="theme-preview">
            <div className="theme-color" style={{ background: 'var(--primary)' }}></div>
            <div className="theme-color" style={{ background: 'var(--accent)' }}></div>
            <div className="theme-color" style={{ background: 'var(--muted)' }}></div>
          </div>
          <p className="settings-note">Baby-pink theme (default)</p>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">Privacy</h3>
          <p className="settings-description">
            Your diary entries are encrypted locally. All data is stored in SQLite on your device.
          </p>
        </div>
      </div>
    </div>
  );
}

