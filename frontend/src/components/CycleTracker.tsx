import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import './CycleTracker.css';

interface Cycle {
  id: string;
  startDate: string;
  endDate?: string | null;
  flowLevel?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface SymptomDetail {
  painLevel: number; // 0 - 10
  crampsLevel: 'none' | 'less' | 'moderate' | 'severe';
  flowAmount: 'spotting' | 'light' | 'moderate' | 'heavy';
  symptoms: string[];
  notes: string;
}

export default function CycleTracker() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  const [deletingCycleId, setDeletingCycleId] = useState<string | null>(null);

  // Form State
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [flowAmount, setFlowAmount] = useState<'spotting' | 'light' | 'moderate' | 'heavy'>('moderate');
  const [painLevel, setPainLevel] = useState<number>(3);
  const [crampsLevel, setCrampsLevel] = useState<'none' | 'less' | 'moderate' | 'severe'>('moderate');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['cramps', 'fatigue']);
  const [notes, setNotes] = useState('');

  // Fetch cycles
  const { data: cycles, isLoading } = useQuery<Cycle[]>({
    queryKey: ['cycles'],
    queryFn: async () => {
      const response = await apiClient.get('/cycles');
      return response.data;
    },
  });

  // Create Cycle
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/cycles', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      closeModal();
    },
  });

  // Update Cycle
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.put(`/cycles/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      closeModal();
    },
  });

  // Delete Cycle
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/cycles/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      setDeletingCycleId(null);
    },
  });

  const openCreateModal = () => {
    setEditingCycle(null);
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setFlowAmount('moderate');
    setPainLevel(3);
    setCrampsLevel('moderate');
    setSelectedSymptoms(['cramps', 'fatigue']);
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (cycle: Cycle) => {
    setEditingCycle(cycle);
    setStartDate(cycle.startDate.split('T')[0]);
    setEndDate(cycle.endDate ? cycle.endDate.split('T')[0] : '');

    let parsedNotes = cycle.notes || '';
    let parsedFlow = (cycle.flowLevel as any) || 'moderate';
    let parsedPain = 3;
    let parsedCramps: 'none' | 'less' | 'moderate' | 'severe' = 'moderate';
    let parsedSymptoms: string[] = [];

    if (parsedNotes.startsWith('{') && parsedNotes.endsWith('}')) {
      try {
        const detail: SymptomDetail = JSON.parse(parsedNotes);
        parsedPain = detail.painLevel ?? 3;
        parsedCramps = detail.crampsLevel || 'moderate';
        parsedFlow = detail.flowAmount || parsedFlow;
        parsedSymptoms = detail.symptoms || [];
        parsedNotes = detail.notes || '';
      } catch {}
    }

    setFlowAmount(parsedFlow);
    setPainLevel(parsedPain);
    setCrampsLevel(parsedCramps);
    setSelectedSymptoms(parsedSymptoms);
    setNotes(parsedNotes);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCycle(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const detailPayload: SymptomDetail = {
      painLevel,
      crampsLevel,
      flowAmount,
      symptoms: selectedSymptoms,
      notes,
    };

    const payload = {
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : null,
      flowLevel: flowAmount,
      notes: JSON.stringify(detailPayload),
    };

    if (editingCycle) {
      updateMutation.mutate({ id: editingCycle.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleSymptom = (sym: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const getPainColor = (level: number) => {
    if (level <= 2) return '#00e676';
    if (level <= 5) return '#ffb300';
    if (level <= 7) return '#ff9100';
    return '#ff1744';
  };

  const getPainLabel = (level: number) => {
    if (level === 0) return 'None (0)';
    if (level <= 3) return `Mild (${level}/10)`;
    if (level <= 6) return `Moderate (${level}/10)`;
    return `Severe (${level}/10)`;
  };

  const getCrampsLabel = (level: string) => {
    switch (level) {
      case 'none': return 'None 😌';
      case 'less': return 'Less / Mild 🟢';
      case 'moderate': return 'Moderate 🟡';
      case 'severe': return 'Severe 🔥';
      default: return level;
    }
  };

  const getFlowLabel = (flow: string) => {
    switch (flow) {
      case 'spotting': return 'Spotting 🌸';
      case 'light': return 'Light (Less) 💧';
      case 'moderate': return 'Moderate 💧💧';
      case 'heavy': return 'Heavy (Severe) 💧💧💧';
      default: return flow;
    }
  };

  const latestCycle = cycles?.[0];
  const daysSinceStart = latestCycle
    ? Math.floor((new Date().getTime() - new Date(latestCycle.startDate).getTime()) / (1000 * 3600 * 24))
    : 1;

  return (
    <div className="cycle-tracker-container">
      {/* Header Banner */}
      <div className="cycle-header-glass">
        <div className="cycle-header-info">
          <span className="phase-badge-pill">🌸 Follicular Phase — Day {Math.max(1, daysSinceStart + 1)}</span>
          <h2>Cycle Tracker & Symptom Log</h2>
          <p>Track periods, cramps, pain levels, and flow intensity with real-time analytics.</p>
        </div>
        <button className="add-cycle-btn" onClick={openCreateModal}>
          ✨ + Log Period & Symptoms
        </button>
      </div>

      {/* Analytics Row */}
      <div className="cycle-analytics-grid">
        <div className="analytic-card">
          <span className="analytic-icon">📅</span>
          <div className="analytic-details">
            <span className="analytic-val">28 Days</span>
            <span className="analytic-lbl">Avg Cycle Length</span>
          </div>
        </div>

        <div className="analytic-card">
          <span className="analytic-icon">🩸</span>
          <div className="analytic-details">
            <span className="analytic-val">5 Days</span>
            <span className="analytic-lbl">Avg Period Duration</span>
          </div>
        </div>

        <div className="analytic-card">
          <span className="analytic-icon">🔮</span>
          <div className="analytic-details">
            <span className="analytic-val">Aug 14, 2026</span>
            <span className="analytic-lbl">Predicted Next Period</span>
          </div>
        </div>

        <div className="analytic-card">
          <span className="analytic-icon">📊</span>
          <div className="analytic-details">
            <span className="analytic-val">{cycles?.length || 0} Saved</span>
            <span className="analytic-lbl">Total Records Logged</span>
          </div>
        </div>
      </div>

      {/* Cycle List Header */}
      <div className="list-section-header">
        <h3>Recorded Periods & Symptoms</h3>
        <span className="count-tag">{cycles?.length || 0} Entries</span>
      </div>

      {/* Cycle Records Grid */}
      {isLoading ? (
        <div className="cycle-loading">Loading cycle history...</div>
      ) : cycles?.length === 0 ? (
        <div className="empty-cycle-box glass-box">
          <span className="empty-emoji">🩸</span>
          <h4>No cycle records logged yet</h4>
          <p>Tap the button above to log your first period, pain levels, and cramps.</p>
          <button className="empty-action-btn" onClick={openCreateModal}>
            + Log First Period
          </button>
        </div>
      ) : (
        <div className="cycles-history-grid">
          {cycles?.map((c) => {
            let detail: SymptomDetail | null = null;
            if (c.notes?.startsWith('{') && c.notes.endsWith('}')) {
              try {
                detail = JSON.parse(c.notes);
              } catch {}
            }

            return (
              <div key={c.id} className="cycle-record-card glass-card">
                <div className="card-top-bar">
                  <div className="card-date-badge">
                    <span className="cal-icon">🗓️</span>
                    <span className="date-range">
                      {new Date(c.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {c.endDate ? ` — ${new Date(c.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ' (Active)'}
                    </span>
                  </div>
                  <div className="card-actions">
                    <button className="edit-btn" title="Edit Cycle" onClick={() => openEditModal(c)}>
                      ✏️ Edit
                    </button>
                    <button
                      className="delete-btn"
                      title="Delete Record"
                      onClick={() => setDeletingCycleId(c.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                <div className="metrics-row">
                  <div className="metric-pill flow-pill">
                    <span className="metric-lbl">Flow:</span>
                    <span className="metric-val">{getFlowLabel(c.flowLevel || detail?.flowAmount || 'moderate')}</span>
                  </div>

                  {detail && (
                    <div className="metric-pill pain-pill" style={{ borderColor: getPainColor(detail.painLevel) }}>
                      <span className="metric-lbl">Pain:</span>
                      <span className="metric-val" style={{ color: getPainColor(detail.painLevel) }}>
                        {getPainLabel(detail.painLevel)}
                      </span>
                    </div>
                  )}

                  {detail && (
                    <div className="metric-pill cramps-pill">
                      <span className="metric-lbl">Cramps:</span>
                      <span className="metric-val">{getCrampsLabel(detail.crampsLevel)}</span>
                    </div>
                  )}
                </div>

                {detail?.symptoms && detail.symptoms.length > 0 && (
                  <div className="symptoms-chip-list">
                    {detail.symptoms.map((s) => (
                      <span key={s} className="sym-tag">
                        #{s}
                      </span>
                    ))}
                  </div>
                )}

                {(detail?.notes || (c.notes && !c.notes.startsWith('{'))) && (
                  <div className="record-notes">
                    💡 <em>"{detail?.notes || c.notes}"</em>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Explicit Delete Warning Modal */}
      {deletingCycleId && (
        <div className="cycle-modal-backdrop">
          <div className="warning-modal-card glass-card">
            <div className="warning-modal-header">
              <span className="warning-icon">⚠️</span>
              <h3>Delete Cycle Record?</h3>
            </div>
            <p className="warning-modal-text">
              Are you sure you want to permanently delete this period and symptom record? This action cannot be undone.
            </p>
            <div className="warning-modal-actions">
              <button className="cancel-btn" onClick={() => setDeletingCycleId(null)}>
                Cancel
              </button>
              <button
                className="confirm-delete-btn"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletingCycleId)}
              >
                {deleteMutation.isPending ? 'Deleting...' : '🔥 Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Create / Edit Modal */}
      {isModalOpen && (
        <div className="cycle-modal-backdrop">
          <div className="cycle-glass-modal">
            <div className="modal-top">
              <h3>{editingCycle ? '✏️ Edit Cycle & Symptoms' : '✨ Log Period & Symptoms'}</h3>
              <button className="close-modal-x" onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleSave} className="cycle-form">
              <div className="form-grid-2">
                <div className="form-field">
                  <label>Period Start Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label>Period End Date (Optional)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Amount of Flow (Scale)</label>
                <div className="selector-btn-group">
                  <button
                    type="button"
                    className={`select-chip ${flowAmount === 'spotting' ? 'active' : ''}`}
                    onClick={() => setFlowAmount('spotting')}
                  >
                    🌸 Spotting
                  </button>
                  <button
                    type="button"
                    className={`select-chip ${flowAmount === 'light' ? 'active' : ''}`}
                    onClick={() => setFlowAmount('light')}
                  >
                    💧 Light (Less)
                  </button>
                  <button
                    type="button"
                    className={`select-chip ${flowAmount === 'moderate' ? 'active' : ''}`}
                    onClick={() => setFlowAmount('moderate')}
                  >
                    💧💧 Moderate
                  </button>
                  <button
                    type="button"
                    className={`select-chip ${flowAmount === 'heavy' ? 'active' : ''}`}
                    onClick={() => setFlowAmount('heavy')}
                  >
                    💧💧💧 Heavy (Severe)
                  </button>
                </div>
              </div>

              <div className="form-field">
                <div className="label-with-val">
                  <label>Pain Intensity Scale (0 - 10)</label>
                  <span className="pain-val-display" style={{ color: getPainColor(painLevel) }}>
                    {getPainLabel(painLevel)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={painLevel}
                  onChange={(e) => setPainLevel(Number(e.target.value))}
                  className="pain-slider"
                />
                <div className="slider-ticks">
                  <span>0 (None)</span>
                  <span>3 (Less)</span>
                  <span>6 (Moderate)</span>
                  <span>10 (Severe)</span>
                </div>
              </div>

              <div className="form-field">
                <label>Cramps Intensity</label>
                <div className="selector-btn-group">
                  <button
                    type="button"
                    className={`select-chip ${crampsLevel === 'none' ? 'active' : ''}`}
                    onClick={() => setCrampsLevel('none')}
                  >
                    😌 None
                  </button>
                  <button
                    type="button"
                    className={`select-chip ${crampsLevel === 'less' ? 'active' : ''}`}
                    onClick={() => setCrampsLevel('less')}
                  >
                    🟢 Less / Mild
                  </button>
                  <button
                    type="button"
                    className={`select-chip ${crampsLevel === 'moderate' ? 'active' : ''}`}
                    onClick={() => setCrampsLevel('moderate')}
                  >
                    🟡 Moderate
                  </button>
                  <button
                    type="button"
                    className={`select-chip ${crampsLevel === 'severe' ? 'active' : ''}`}
                    onClick={() => setCrampsLevel('severe')}
                  >
                    🔥 Severe
                  </button>
                </div>
              </div>

              <div className="form-field">
                <label>Symptoms & Body Experiences</label>
                <div className="symptoms-chips-select">
                  {[
                    { id: 'cramps', label: '⚡ Cramps' },
                    { id: 'fatigue', label: '😴 Fatigue' },
                    { id: 'headache', label: '🤕 Headache' },
                    { id: 'bloating', label: '🎈 Bloating' },
                    { id: 'moodswings', label: '🎭 Mood Swings' },
                    { id: 'acne', label: '🫧 Acne' },
                    { id: 'backache', label: '🧘 Backache' },
                    { id: 'cravings', label: '🍫 Sweet Cravings' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`sym-select-btn ${selectedSymptoms.includes(item.id) ? 'selected' : ''}`}
                      onClick={() => toggleSymptom(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-field">
                <label>Notes & Self-Care Observations</label>
                <textarea
                  placeholder="E.g., Used heating pad, drank herbal tea, rest level..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="modal-bottom-actions">
                <button type="button" className="cancel-btn" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="save-submit-btn"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingCycle
                    ? 'Save Updates'
                    : 'Record Entry ✨'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
