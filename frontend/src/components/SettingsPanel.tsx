import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import './SettingsPanel.css';

export default function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<'profile' | 'voice' | 'appearance' | 'notifications' | 'privacy'>('profile');
  const queryClient = useQueryClient();
  const { user, updateUser, logout } = useAuthStore();

  // Profile Settings State
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [avatarUrl, setAvatarUrl] = useState('');

  // Voice Settings State
  const [voiceName, setVoiceName] = useState('soft-female');
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [voicePitch, setVoicePitch] = useState(1.0);
  const [voiceVolume, setVoiceVolume] = useState(1.0);
  const [continuousListening, setContinuousListening] = useState(false);

  // Appearance & Theme State (Light / Dark mode toggle)
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('dark');
  const [themeIntensity, setThemeIntensity] = useState('soft-pink');

  // Notifications State
  const [reminderPref, setReminderPref] = useState(true);
  const [comfortPref, setComfortPref] = useState(true);

  // Wipe Confirmation State
  const [wipingSection, setWipingSection] = useState<string | null>(null);
  const [isWiping, setIsWiping] = useState(false);

  // Preset Avatars
  const presetAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  ];

  // Fetch Current Settings
  const { data: userSettings } = useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const res = await apiClient.get('/settings');
      return res.data;
    },
  });

  useEffect(() => {
    if (userSettings) {
      setName(userSettings.name || user?.name || '');
      setDob(userSettings.dob || '');
      setCycleLength(userSettings.cycleLength || 28);
      setPeriodLength(userSettings.periodLength || 5);

      const s = userSettings.settings || {};
      setVoiceName(s.voiceName || 'soft-female');
      setVoiceSpeed(s.voiceSpeed || 1.0);
      setVoicePitch(s.voicePitch || 1.0);
      setVoiceVolume(s.voiceVolume || 1.0);
      setContinuousListening(s.continuousListening || false);
      setThemeIntensity(s.themeIntensity || 'soft-pink');
      setColorMode(s.colorMode || 'dark');
      setAvatarUrl(s.avatarUrl || user?.avatarUrl || presetAvatars[0]);
      setReminderPref(s.reminderPref ?? true);
      setComfortPref(s.comfortPref ?? true);

      if (s.colorMode) {
        document.documentElement.setAttribute('data-theme', s.colorMode);
      }
      if (s.themeIntensity) {
        document.documentElement.setAttribute('data-accent-theme', s.themeIntensity);
      }
    }
  }, [userSettings]);

  // Apply Theme Mode dynamically
  const toggleColorMode = (mode: 'light' | 'dark') => {
    setColorMode(mode);
    document.documentElement.setAttribute('data-theme', mode);
  };

  // Apply Accent Theme dynamically
  const changeAccentTheme = (theme: string) => {
    setThemeIntensity(theme);
    document.documentElement.setAttribute('data-accent-theme', theme);
  };

  // Profile Picture Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarUrl(result);
        updateUser({ avatarUrl: result });
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Settings Mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      updateUser({ name, avatarUrl });
      return apiClient.put('/settings', {
        name,
        dob,
        cycleLength: Number(cycleLength),
        periodLength: Number(periodLength),
        settings: {
          avatarUrl,
          voiceName,
          voiceSpeed,
          voicePitch,
          voiceVolume,
          continuousListening,
          themeIntensity,
          colorMode,
          reminderPref,
          comfortPref,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      alert('✨ Settings & Profile picture saved successfully!');
    },
  });

  // Export Data JSON
  const handleExportData = async () => {
    try {
      const res = await apiClient.get('/settings/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gurlz-wellness-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    } catch {
      alert('Failed to export data.');
    }
  };

  // Confirm and Execute Data Wipe
  const confirmDataWipe = async () => {
    if (!wipingSection) return;
    setIsWiping(true);
    try {
      await apiClient.delete(`/settings/data?section=${wipingSection}`);
      queryClient.invalidateQueries();
      if (wipingSection === 'account') {
        logout();
        window.location.href = '/login';
      } else {
        alert(`Successfully deleted ${wipingSection} data.`);
      }
    } catch {
      alert('Failed to delete data section.');
    } finally {
      setIsWiping(false);
      setWipingSection(null);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header glass-card">
        <h2>⚙️ Expanded Settings & Data Control</h2>
        <p>Personalize your voice companion, profile picture, light/dark aesthetics, and privacy controls.</p>
      </div>

      {/* Tabs Row */}
      <div className="settings-tabs-row">
        <button className={`tab-chip ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          👤 Profile & Avatar
        </button>
        <button className={`tab-chip ${activeTab === 'voice' ? 'active' : ''}`} onClick={() => setActiveTab('voice')}>
          🎙️ Voice
        </button>
        <button className={`tab-chip ${activeTab === 'appearance' ? 'active' : ''}`} onClick={() => setActiveTab('appearance')}>
          🎨 Appearance & Mode
        </button>
        <button className={`tab-chip ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
          🔔 Notifications
        </button>
        <button className={`tab-chip ${activeTab === 'privacy' ? 'active' : ''}`} onClick={() => setActiveTab('privacy')}>
          🔒 Privacy & Data Wipe
        </button>
      </div>

      {/* Tab Content */}
      <div className="settings-content-card glass-card">
        {activeTab === 'profile' && (
          <div className="tab-pane">
            <h3>Personal Profile & Avatar</h3>

            {/* Avatar Selector */}
            <div className="form-row avatar-section">
              <label>Profile Picture</label>
              <div className="avatar-picker-container">
                <div className="current-avatar-preview">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="preview-avatar-img" />
                  ) : (
                    <div className="preview-avatar-placeholder">{name?.[0] || 'U'}</div>
                  )}
                </div>
                <div className="avatar-options">
                  <p className="avatar-sub">Choose a preset avatar or upload your photo:</p>
                  <div className="preset-avatars-grid">
                    {presetAvatars.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Preset ${idx}`}
                        className={`preset-img ${avatarUrl === url ? 'selected' : ''}`}
                        onClick={() => {
                          setAvatarUrl(url);
                          updateUser({ avatarUrl: url });
                        }}
                      />
                    ))}
                  </div>
                  <div className="upload-btn-wrapper">
                    <label htmlFor="avatar-upload" className="upload-file-btn">
                      📷 Upload Photo
                    </label>
                    <input id="avatar-upload" type="file" accept="image/*" onChange={handleFileUpload} hidden />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-row">
              <label>Your Display Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Date of Birth</label>
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div className="form-row">
              <label>Average Cycle Length (Days)</label>
              <input type="number" value={cycleLength} onChange={(e) => setCycleLength(Number(e.target.value))} />
            </div>
            <div className="form-row">
              <label>Average Period Length (Days)</label>
              <input type="number" value={periodLength} onChange={(e) => setPeriodLength(Number(e.target.value))} />
            </div>
          </div>
        )}

        {activeTab === 'voice' && (
          <div className="tab-pane">
            <h3>AI Companion Voice Settings</h3>
            <div className="form-row">
              <label>Voice Selection</label>
              <select value={voiceName} onChange={(e) => setVoiceName(e.target.value)}>
                <option value="soft-female">Soft & Warm Female (Default)</option>
                <option value="calm-soothing">Calm & Soothing</option>
                <option value="energetic-cute">Cute & Energetic</option>
              </select>
            </div>
            <div className="form-row">
              <label>Speech Speed: {voiceSpeed}x</label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={voiceSpeed}
                onChange={(e) => setVoiceSpeed(Number(e.target.value))}
              />
            </div>
            <div className="form-row">
              <label>Speech Pitch: {voicePitch}</label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={voicePitch}
                onChange={(e) => setVoicePitch(Number(e.target.value))}
              />
            </div>
            <div className="form-row toggle-row">
              <label>Continuous Listening Mode</label>
              <input
                type="checkbox"
                checked={continuousListening}
                onChange={(e) => setContinuousListening(e.target.checked)}
              />
            </div>
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="tab-pane">
            <h3>Visual Aesthetics & Theme Mode</h3>

            <div className="form-row">
              <label>Interface Theme Mode</label>
              <div className="theme-mode-toggle-group">
                <button
                  className={`mode-btn ${colorMode === 'dark' ? 'active' : ''}`}
                  onClick={() => toggleColorMode('dark')}
                >
                  🌙 Dark Mode (Default)
                </button>
                <button
                  className={`mode-btn ${colorMode === 'light' ? 'active' : ''}`}
                  onClick={() => toggleColorMode('light')}
                >
                  ☀️ Soft Light Mode
                </button>
              </div>
            </div>

            <div className="form-row">
              <label>Pink Aesthetic Accent Theme</label>
              <select value={themeIntensity} onChange={(e) => changeAccentTheme(e.target.value)}>
                <option value="soft-pink">Soft Blush Pink 🌸 (Default)</option>
                <option value="rose-gold">Rose Gold ✨</option>
                <option value="neon-pink">Vibrant Neon Pink 💖</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="tab-pane">
            <h3>Adaptive Reminders & Coach</h3>
            <div className="form-row toggle-row">
              <label>Smart Adaptive Coach Reminders (Hydration, Meals, Sleep, Mood)</label>
              <input
                type="checkbox"
                checked={reminderPref}
                onChange={(e) => setReminderPref(e.target.checked)}
              />
            </div>
            <div className="form-row toggle-row">
              <label>Comfort Mode Audio & Affirmation Preferences</label>
              <input
                type="checkbox"
                checked={comfortPref}
                onChange={(e) => setComfortPref(e.target.checked)}
              />
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="tab-pane">
            <h3>Data Isolation & Storage Management</h3>
            <p className="privacy-desc">Full access to manage, backup, or permanently delete your user data.</p>
            <div className="privacy-actions">
              <button className="export-btn" onClick={handleExportData}>
                📥 Export All Data (JSON Backup)
              </button>
              <div className="wipe-buttons">
                <button onClick={() => setWipingSection('diary')}>🗑️ Delete Personal Diary</button>
                <button onClick={() => setWipingSection('reminders')}>🗑️ Delete Reminders</button>
                <button onClick={() => setWipingSection('notes')}>🗑️ Delete Quick Notes</button>
                <button onClick={() => setWipingSection('chats')}>🗑️ Delete AI Chat History</button>
                <button className="delete-account-btn" onClick={() => setWipingSection('account')}>
                  ⚠️ Delete Account Permanently
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Bar */}
        <div className="settings-save-bar">
          <button
            className="save-all-btn glow-btn"
            disabled={saveSettingsMutation.isPending}
            onClick={() => saveSettingsMutation.mutate()}
          >
            {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Wipe Confirmation Warning Modal */}
      {wipingSection && (
        <div className="cycle-modal-backdrop">
          <div className="warning-modal-card glass-card">
            <div className="warning-modal-header">
              <span className="warning-icon">⚠️</span>
              <h3>
                {wipingSection === 'account'
                  ? 'CRITICAL WARNING: Delete Account?'
                  : `Delete ${wipingSection.toUpperCase()} Data?`}
              </h3>
            </div>
            <p className="warning-modal-text">
              {wipingSection === 'account'
                ? 'This will permanently delete your entire account, profile, cycle logs, diary entries, and preferences. THIS ACTION IS IRREVERSIBLE!'
                : `Are you sure you want to permanently clear all data records for '${wipingSection}'? This action cannot be reversed.`}
            </p>
            <div className="warning-modal-actions">
              <button className="cancel-btn" onClick={() => setWipingSection(null)}>
                Cancel
              </button>
              <button
                className="confirm-delete-btn"
                disabled={isWiping}
                onClick={confirmDataWipe}
              >
                {isWiping ? 'Deleting...' : '🔥 Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
