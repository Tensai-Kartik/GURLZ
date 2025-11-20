import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import './DiaryPanel.css';

export default function DiaryPanel() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  const { data: entries } = useQuery({
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
      setTitle('');
      setContent('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && content) {
      createEntry.mutate({ title, content, tags: [] });
    }
  };

  return (
    <div className="diary-panel">
      <h2 className="view-title">Personal Diary</h2>
      <form onSubmit={handleSubmit} className="diary-form">
        <input
          type="text"
          placeholder="Entry title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="diary-title-input"
        />
        <textarea
          placeholder="Write your thoughts..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="diary-content-input"
          rows={10}
        />
        <button type="submit" className="diary-save-button">
          Save Entry
        </button>
      </form>
      <div className="diary-entries">
        {entries?.map((entry: any) => (
          <div key={entry.id} className="diary-entry">
            <div className="diary-entry-title">{entry.title}</div>
            <div className="diary-entry-content">{entry.content}</div>
            <div className="diary-entry-date">
              {new Date(entry.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

