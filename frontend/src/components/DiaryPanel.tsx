import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import './DiaryPanel.css';

interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
}

export default function DiaryPanel() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: entries, isLoading } = useQuery<DiaryEntry[]>({
    queryKey: ['diary'],
    queryFn: async () => {
      const response = await apiClient.get('/diary');
      return response.data;
    },
  });

  const createEntry = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiClient.post('/diary', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diary'] });
      resetForm();
    },
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiClient.put(`/diary/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diary'] });
      resetForm();
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/diary/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diary'] });
      setDeletingId(null);
    },
  });

  const resetForm = () => {
    setTitle('');
    setContent('');
    setEditingEntry(null);
  };

  const handleEditClick = (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setTitle(entry.title);
    setContent(entry.content);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    if (editingEntry) {
      updateEntry.mutate({ id: editingEntry.id, data: { title, content } });
    } else {
      createEntry.mutate({ title, content, tags: [] });
    }
  };

  return (
    <div className="diary-panel">
      <div className="diary-header">
        <h2 className="view-title">Personal Diary</h2>
        <p className="diary-subtext">Encrypted & private sanctuary for your personal reflections.</p>
      </div>

      <form onSubmit={handleSubmit} className="diary-form glass-card">
        <div className="form-title-row">
          <h3>{editingEntry ? '✏️ Edit Diary Entry' : '📝 New Journal Entry'}</h3>
          {editingEntry && (
            <button type="button" className="cancel-edit-btn" onClick={resetForm}>
              Cancel Edit
            </button>
          )}
        </div>
        <input
          type="text"
          placeholder="Entry title (e.g. Quiet afternoon thoughts...)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="diary-title-input"
          required
        />
        <textarea
          placeholder="Write your thoughts freely..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="diary-content-input"
          rows={7}
          required
        />
        <button
          type="submit"
          className="diary-save-button"
          disabled={createEntry.isPending || updateEntry.isPending}
        >
          {createEntry.isPending || updateEntry.isPending
            ? 'Saving...'
            : editingEntry
            ? 'Update Entry ✨'
            : 'Save Private Entry ✨'}
        </button>
      </form>

      <div className="diary-entries-header">
        <h3>Previous Diary Entries</h3>
        <span className="entry-count">{entries?.length || 0} Entries</span>
      </div>

      {isLoading ? (
        <div className="diary-loading">Loading encrypted entries...</div>
      ) : entries?.length === 0 ? (
        <div className="empty-diary-box glass-card">
          <span className="empty-icon">📖</span>
          <p>Your diary is empty. Write your first reflection above!</p>
        </div>
      ) : (
        <div className="diary-entries">
          {entries?.map((entry) => (
            <div key={entry.id} className="diary-entry glass-card">
              <div className="diary-card-top">
                <div className="diary-entry-title">{entry.title}</div>
                <div className="diary-card-actions">
                  <button className="edit-mini-btn" title="Edit Entry" onClick={() => handleEditClick(entry)}>
                    ✏️ Edit
                  </button>
                  <button className="delete-mini-btn" title="Delete Entry" onClick={() => setDeletingId(entry.id)}>
                    🗑️ Delete
                  </button>
                </div>
              </div>

              <div className="diary-entry-content">{entry.content}</div>

              <div className="diary-entry-date">
                🗓️ {new Date(entry.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Warning Modal Overlay */}
      {deletingId && (
        <div className="cycle-modal-backdrop">
          <div className="warning-modal-card glass-card">
            <div className="warning-modal-header">
              <span className="warning-icon">⚠️</span>
              <h3>Delete Diary Entry?</h3>
            </div>
            <p className="warning-modal-text">
              Are you sure you want to permanently delete this diary entry? It will be erased from your private storage immediately.
            </p>
            <div className="warning-modal-actions">
              <button className="cancel-btn" onClick={() => setDeletingId(null)}>
                Cancel
              </button>
              <button
                className="confirm-delete-btn"
                disabled={deleteEntry.isPending}
                onClick={() => deleteEntry.mutate(deletingId)}
              >
                {deleteEntry.isPending ? 'Deleting...' : '🔥 Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
