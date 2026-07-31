import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import './DashboardView.css';

interface DashboardViewProps {
  setActiveView: (view: string) => void;
  openAskAI: () => void;
}

export default function DashboardView({ setActiveView, openAskAI }: DashboardViewProps) {
  const queryClient = useQueryClient();
  const [customWater, setCustomWater] = useState('');
  const [showCustomWaterModal, setShowCustomWaterModal] = useState(false);
  const [mealText, setMealText] = useState('');
  const [mealType, setMealType] = useState('Breakfast');
  const [showMealModal, setShowMealModal] = useState(false);
  const [moodSelect, setMoodSelect] = useState('Calm');
  const [showMoodModal, setShowMoodModal] = useState(false);

  // Fetch complete real database dashboard summary
  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/summary');
      return response.data;
    },
    refetchInterval: 30000,
  });

  // Log Hydration Mutation
  const addWaterMutation = useMutation({
    mutationFn: async (amountMl: number) => {
      return apiClient.post('/hydration', { amountMl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['hydration'] });
      setShowCustomWaterModal(false);
      setCustomWater('');
    },
  });

  // Log Meal Mutation
  const addMealMutation = useMutation({
    mutationFn: async (mealData: { mealType: string; description: string }) => {
      return apiClient.post('/meals', mealData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      setShowMealModal(false);
      setMealText('');
    },
  });

  // Log Mood Mutation
  const addMoodMutation = useMutation({
    mutationFn: async (moodData: { mood: string; intensity: number }) => {
      return apiClient.post('/mood', moodData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['mood'] });
      setShowMoodModal(false);
    },
  });

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-orb"></div>
        <p>Curating your personalized wellness space...</p>
      </div>
    );
  }

  const hydrationProgress = summary?.hydration?.progress || 0;

  return (
    <div className="dashboard-view-container">
      {/* Top Banner Greeting & AI Insight */}
      <header className="dashboard-header glass-section">
        <div className="header-text">
          <h1 className="user-greeting">{summary?.greeting || 'Welcome back ✨'}</h1>
          <p className="dashboard-tagline">Here is your real-time daily wellness overview.</p>
        </div>
        <div className="weather-badge">
          <span className="weather-icon">☀️</span>
          <div className="weather-info">
            <span className="weather-temp">{summary?.weather?.temp || 26}°C</span>
            <span className="weather-cond">{summary?.weather?.condition || 'Sunny'}</span>
          </div>
        </div>
      </header>

      {/* AI Wellness Summary Banner */}
      <div className="ai-summary-card glass-section">
        <div className="summary-sparkle">✨</div>
        <div className="summary-content">
          <h3>GURLZ AI Daily Wellness Summary</h3>
          <p>{summary?.aiSummary || "Your body is moving harmoniously today. Stay hydrated and prioritize restful sleep!"}</p>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="quick-actions-bar">
        <button className="action-chip" onClick={() => addWaterMutation.mutate(250)}>
          💧 +1 Glass
        </button>
        <button className="action-chip" onClick={() => addWaterMutation.mutate(500)}>
          🚰 +2 Glasses
        </button>
        <button className="action-chip" onClick={() => setShowMealModal(true)}>
          🥗 Log Meal
        </button>
        <button className="action-chip" onClick={() => setShowMoodModal(true)}>
          🌸 Log Mood
        </button>
        <button className="action-chip highlight" onClick={openAskAI}>
          ❓ Ask AI
        </button>
        <button className="action-chip comfort" onClick={() => setActiveView('comfort')}>
          🕯️ Comfort Mode
        </button>
        <button className="action-chip order" onClick={() => setActiveView('pads')}>
          🛍️ Order Essentials
        </button>
      </div>

      {/* Grid Layout of Wellness Cards */}
      <div className="dashboard-grid">
        {/* Cycle Card */}
        <div className="dash-card cycle-card glass-card">
          <div className="card-header">
            <span className="card-icon">📅</span>
            <h3>Cycle Status</h3>
          </div>
          <div className="cycle-badge-pill">{summary?.cycle?.phase || 'Follicular Phase'}</div>
          <div className="cycle-details">
            <div className="metric-item">
              <span className="label">Day of Cycle</span>
              <span className="value">Day {summary?.cycle?.dayOfCycle || 1}</span>
            </div>
            <div className="metric-item">
              <span className="label">Next Period</span>
              <span className="value">
                {summary?.cycle?.nextPeriodDate
                  ? new Date(summary?.cycle?.nextPeriodDate).toLocaleDateString([], { month: 'short', day: 'numeric' })
                  : 'In 14 days'}
              </span>
            </div>
          </div>
          <button className="card-action-btn" onClick={() => setActiveView('cycle')}>
            View Cycle Details →
          </button>
        </div>

        {/* Wellness Score Card */}
        <div className="dash-card score-card glass-card">
          <div className="card-header">
            <span className="card-icon">💖</span>
            <h3>Wellness Score</h3>
          </div>
          <div className="score-ring-container">
            <div className="score-ring">
              <span className="score-number">{summary?.wellnessScore || 85}</span>
              <span className="score-label">/ 100</span>
            </div>
          </div>
          <p className="score-hint">Calculated dynamically from your sleep, hydration, and meal activity today.</p>
        </div>

        {/* Hydration Widget */}
        <div className="dash-card hydration-card glass-card">
          <div className="card-header">
            <span className="card-icon">💧</span>
            <h3>Hydration Progress</h3>
          </div>
          <div className="hydration-meter">
            <div className="meter-fill" style={{ width: `${hydrationProgress}%` }}></div>
          </div>
          <div className="hydration-stats">
            <span className="amount">{summary?.hydration?.amountMl || 0} / {summary?.hydration?.goalMl || 2000} ml</span>
            <span className="percent">{hydrationProgress}%</span>
          </div>
          <div className="hydration-quick-btns">
            <button onClick={() => addWaterMutation.mutate(250)}>+250ml</button>
            <button onClick={() => addWaterMutation.mutate(500)}>+500ml</button>
            <button onClick={() => setShowCustomWaterModal(true)}>Custom</button>
          </div>
        </div>

        {/* Meal Status Widget */}
        <div className="dash-card meal-card glass-card">
          <div className="card-header">
            <span className="card-icon">🥗</span>
            <h3>Meal Status</h3>
          </div>
          <p className="meal-count">{summary?.meals?.count || 0} meal(s) logged today</p>
          {summary?.meals?.latest ? (
            <div className="latest-meal-box">
              <strong>Latest: {summary.meals.latest.mealType}</strong>
              <p>{summary.meals.latest.description}</p>
              {summary.meals.latest.recommendation && (
                <span className="meal-rec">💡 {summary.meals.latest.recommendation}</span>
              )}
            </div>
          ) : (
            <p className="empty-hint">No meals logged yet today.</p>
          )}
          <button className="card-action-btn" onClick={() => setShowMealModal(true)}>
            + Log a Meal
          </button>
        </div>

        {/* Sleep Summary Widget */}
        <div className="dash-card sleep-card glass-card">
          <div className="card-header">
            <span className="card-icon">💤</span>
            <h3>Sleep Summary</h3>
          </div>
          <div className="sleep-metric">
            <span className="sleep-hours">{summary?.sleep?.hours || 7.5}</span>
            <span className="sleep-unit">Hours</span>
          </div>
          <span className="sleep-quality-badge">Quality: {summary?.sleep?.quality || 'Good'}</span>
          <p className="sleep-tip">{summary?.sleep?.suggestions || "Rest satisfies your body's natural recovery process."}</p>
        </div>

        {/* Mood Summary Widget */}
        <div className="dash-card mood-card glass-card">
          <div className="card-header">
            <span className="card-icon">🌸</span>
            <h3>Current Mood</h3>
          </div>
          <div className="mood-display">
            <span className="mood-name">{summary?.mood?.mood || 'Calm'}</span>
            <span className="mood-intensity">Intensity: {summary?.mood?.intensity || 7}/10</span>
          </div>
          <button className="card-action-btn" onClick={() => setShowMoodModal(true)}>
            Update Mood →
          </button>
        </div>
      </div>

      {/* Custom Water Modal */}
      {showCustomWaterModal && (
        <div className="modal-backdrop">
          <div className="modal-card glass-card">
            <h3>Log Custom Water Amount</h3>
            <input
              type="number"
              placeholder="Amount in ml (e.g. 350)"
              value={customWater}
              onChange={(e) => setCustomWater(e.target.value)}
            />
            <div className="modal-actions">
              <button onClick={() => setShowCustomWaterModal(false)}>Cancel</button>
              <button
                className="confirm-btn"
                onClick={() => customWater && addWaterMutation.mutate(Number(customWater))}
              >
                Log Water
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Meal Modal */}
      {showMealModal && (
        <div className="modal-backdrop">
          <div className="modal-card glass-card">
            <h3>Log a Meal</h3>
            <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
              <option value="Breakfast">Breakfast 🍳</option>
              <option value="Lunch">Lunch 🥗</option>
              <option value="Dinner">Dinner 🍲</option>
              <option value="Snack">Snack 🍇</option>
            </select>
            <textarea
              rows={3}
              placeholder="What did you enjoy eating?"
              value={mealText}
              onChange={(e) => setMealText(e.target.value)}
            />
            <div className="modal-actions">
              <button onClick={() => setShowMealModal(false)}>Cancel</button>
              <button
                className="confirm-btn"
                onClick={() => mealText && addMealMutation.mutate({ mealType, description: mealText })}
              >
                Save Meal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Mood Modal */}
      {showMoodModal && (
        <div className="modal-backdrop">
          <div className="modal-card glass-card">
            <h3>Log Your Mood</h3>
            <div className="mood-grid-select">
              {['Happy 😃', 'Calm 😌', 'Anxious 😟', 'Sad 🥺', 'Energetic ⚡', 'Tired 🥱'].map((m) => (
                <button
                  key={m}
                  className={`mood-chip ${moodSelect === m.split(' ')[0] ? 'active' : ''}`}
                  onClick={() => setMoodSelect(m.split(' ')[0])}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowMoodModal(false)}>Cancel</button>
              <button
                className="confirm-btn"
                onClick={() => addMoodMutation.mutate({ mood: moodSelect, intensity: 7 })}
              >
                Save Mood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
