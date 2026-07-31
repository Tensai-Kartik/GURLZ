import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import './AskAIModal.css';

interface AskAIModalProps {
  onClose: () => void;
}

export default function AskAIModal({ onClose }: AskAIModalProps) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<any>(null);

  const askMutation = useMutation({
    mutationFn: async (userQuery: string) => {
      const res = await apiClient.post('/ask-ai', { query: userQuery });
      return res.data;
    },
    onSuccess: (data) => {
      setResponse(data);
    },
  });

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      askMutation.mutate(query.trim());
    }
  };

  return (
    <div className="ask-ai-backdrop">
      <div className="ask-ai-card glass-modal">
        <div className="modal-top">
          <div className="ai-icon-orb">✨</div>
          <div className="top-titles">
            <h2>Ask GURLZ AI</h2>
            <p>Personalized wellness answers tailored to your active cycle & body data</p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {!response ? (
            <form onSubmit={handleAsk} className="ask-form">
              <div className="context-indicator">
                <span className="sparkle">🔒</span>
                <span>Includes your isolated cycle phase, symptoms, sleep, hydration, and mood context</span>
              </div>

              <textarea
                className="ask-input"
                rows={4}
                placeholder="Ask anything (e.g. 'Why am I feeling fatigue today?', 'What foods support my current cycle phase?', 'How can I ease cramps naturally?')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                required
              />

              <div className="suggestion-chips">
                <button type="button" onClick={() => setQuery("Why am I feeling tired during my current cycle phase?")}>
                  💡 Why am I feeling tired?
                </button>
                <button type="button" onClick={() => setQuery("What foods should I eat today for energy?")}>
                  🥗 Nutrient recommendations
                </button>
                <button type="button" onClick={() => setQuery("Gentle tips to ease menstrual cramps?")}>
                  🌸 Ease cramps naturally
                </button>
              </div>

              <button
                type="submit"
                disabled={askMutation.isPending || !query.trim()}
                className="ask-submit-btn glow-btn"
              >
                {askMutation.isPending ? 'Analyzing your wellness context...' : 'Ask AI Companion'}
              </button>
            </form>
          ) : (
            <div className="ai-response-container">
              <div className="user-query-box">
                <strong>You asked:</strong>
                <p>"{response.query}"</p>
              </div>

              <div className="ai-answer-box">
                <div className="ai-badge">✨ GURLZ AI Insights</div>
                <div className="answer-text">{response.answer}</div>
                <div className="disclaimer-text">{response.disclaimer}</div>
              </div>

              <div className="response-actions">
                <button className="ask-another-btn" onClick={() => { setResponse(null); setQuery(''); }}>
                  Ask Another Question
                </button>
                <button className="close-modal-btn" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
