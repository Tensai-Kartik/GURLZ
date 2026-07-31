import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import './ChatInterface.css';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// ── Dynamic Chip Banks ─────────────────────────────────────────────────────────

const MENSTRUAL_CHIPS = [
  { label: 'Help with cramps', emoji: '😖' },
  { label: 'Pain relief tips', emoji: '💊' },
  { label: 'Foods to ease cramps', emoji: '🍫' },
  { label: 'What should I avoid today?', emoji: '🌸' },
  { label: 'How much water should I drink?', emoji: '💧' },
  { label: 'Why am I so tired today?', emoji: '😴' },
  { label: 'Best heating pad tips', emoji: '🔥' },
  { label: 'Mood support for my period', emoji: '💕' },
];

const FOLLICULAR_CHIPS = [
  { label: 'Best foods this week', emoji: '🥗' },
  { label: 'Exercise suggestions', emoji: '🏃' },
  { label: 'Energy insights', emoji: '😊' },
  { label: 'How to boost productivity', emoji: '⚡' },
  { label: 'Best workouts for my phase', emoji: '💪' },
  { label: 'Skin tips for this phase', emoji: '✨' },
  { label: 'How much water should I drink?', emoji: '💧' },
  { label: 'What supplements to take?', emoji: '💊' },
];

const OVULATORY_CHIPS = [
  { label: 'Explain ovulation', emoji: '🌸' },
  { label: 'Energy tips for today', emoji: '⚡' },
  { label: 'Best foods this week', emoji: '🥗' },
  { label: 'Exercise suggestions', emoji: '🏃' },
  { label: 'Am I ovulating now?', emoji: '📊' },
  { label: 'How to track ovulation', emoji: '📅' },
  { label: 'What should I eat today?', emoji: '🍽' },
  { label: 'Mood during ovulation', emoji: '😊' },
];

const LUTEAL_CHIPS = [
  { label: 'Why am I feeling tired?', emoji: '😴' },
  { label: 'Help with PMS mood swings', emoji: '💕' },
  { label: 'Foods to reduce bloating', emoji: '🥗' },
  { label: 'Sleep tips for tonight', emoji: '🌙' },
  { label: 'Stress relief suggestions', emoji: '🧘' },
  { label: 'Magnesium-rich food ideas', emoji: '🍫' },
  { label: 'Why am I craving sweets?', emoji: '🍬' },
  { label: 'Gentle exercise ideas', emoji: '🚶' },
];

const POPULAR_CHIPS = [
  { label: 'Is my cycle regular?', emoji: '❓' },
  { label: 'Why am I bloated?', emoji: '❓' },
  { label: 'Can stress delay periods?', emoji: '❓' },
  { label: 'Foods rich in iron', emoji: '❓' },
  { label: 'Why do I crave sweets?', emoji: '❓' },
  { label: 'Is spotting normal?', emoji: '❓' },
  { label: 'How much water should I drink?', emoji: '❓' },
  { label: 'How can I sleep better?', emoji: '❓' },
  { label: 'Compare this cycle to last month', emoji: '📊' },
  { label: 'Suggest today\'s meals', emoji: '🍽' },
  { label: 'Why am I feeling tired?', emoji: '😴' },
  { label: 'Foods to boost energy', emoji: '⚡' },
];

function getPhaseChips(cycleDay: number, periodLength: number): typeof MENSTRUAL_CHIPS {
  if (cycleDay <= periodLength) return MENSTRUAL_CHIPS;
  if (cycleDay <= 13) return FOLLICULAR_CHIPS;
  if (cycleDay <= 16) return OVULATORY_CHIPS;
  return LUTEAL_CHIPS;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [chipRotation, setChipRotation] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history
  const { data: history } = useQuery({
    queryKey: ['chat-history'],
    queryFn: async () => {
      const response = await apiClient.get('/chat/history');
      return response.data.history || [];
    },
  });

  // Load dashboard to get cycle phase/day
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard/summary');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (history && history.length > 0) {
      setMessages(
        history.map((msg: any, idx: number) => ({
          id: `hist-${idx}-${msg.timestamp || Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          type: msg.type || msg.role,
          content: msg.content,
          timestamp: msg.timestamp || new Date().toISOString(),
        }))
      );
    }
  }, [history]);

  // Dynamic contextual chips — re-randomised on each chipRotation change
  const dynamicChips = useMemo(() => {
    const cycleDay = dashboardData?.cycle?.dayOfCycle || 1;
    const periodLength = dashboardData?.user?.periodLength || 5;

    // Pick 2 contextual chips from phase bank + 2 rotating popular chips
    const phaseChips = pickRandom(getPhaseChips(cycleDay, periodLength), 2);
    const popularChips = pickRandom(POPULAR_CHIPS, 2);

    return [...phaseChips, ...popularChips];
  }, [dashboardData, chipRotation]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const userMsgId = 'usr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      const assistantMessageId = 'ast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          type: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        },
      ]);

      setIsStreaming(true);

      // Add placeholder assistant message for streaming
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          type: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
        },
      ]);

      let fullResponse = '';

      try {
        const token = useAuthStore.getState().token || '';
        const streamResponse = await fetch('/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            message,
            stream: true,
          }),
        });

        if (streamResponse.ok && streamResponse.body) {
          const reader = streamResponse.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.chunk) {
                    fullResponse += data.chunk;
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessageId
                          ? { ...msg, content: fullResponse }
                          : msg
                      )
                    );
                  }
                  if (data.done) {
                    setIsStreaming(false);
                    // Rotate chips after each AI response
                    setChipRotation((r) => r + 1);
                    return;
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
          }
        } else {
          const response = await apiClient.post('/chat', {
            message,
            stream: false,
          });

          fullResponse = response.data.message;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: fullResponse }
                : msg
            )
          );
        }
      } catch (error: any) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
              : msg
          )
        );
      } finally {
        setIsStreaming(false);
        setChipRotation((r) => r + 1);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isStreaming) {
      sendMessage.mutate(input.trim());
      setInput('');
    }
  };

  // Phase label for chip section
  const cycleDay = dashboardData?.cycle?.dayOfCycle || 1;
  const periodLength = dashboardData?.user?.periodLength || 5;
  const phaseName = cycleDay <= periodLength ? 'Menstrual' :
    cycleDay <= 13 ? 'Follicular' :
    cycleDay <= 16 ? 'Ovulatory' : 'Luteal';

  return (
    <div className="chat-interface">
      <div className="chat-messages" ref={chatContainerRef}>
        {messages.length === 0 && (
          <div className="chat-welcome">
            <p>Hello! I'm GURLZ, your AI wellness companion. How can I help you today? 💕</p>
            <p className="chat-welcome-sub">You can type or use voice commands!</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message chat-message-${msg.type}`}>
            <div className="chat-message-content">{msg.content}</div>
            <div className="chat-message-time">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="chat-message chat-message-assistant">
            <div className="chat-typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Dynamic Contextual Quick Chips */}
      <div className="chat-quick-section">
        <div className="chat-quick-header">
          <span className="chip-phase-badge">🌸 {phaseName} Phase · Day {cycleDay}</span>
          <button
            className="chip-refresh-btn"
            onClick={() => setChipRotation((r) => r + 1)}
            title="Refresh suggestions"
            disabled={isStreaming}
          >
            🔄
          </button>
        </div>
        <div className="chat-quick-buttons">
          {dynamicChips.map((btn, idx) => (
            <button
              key={`${chipRotation}-${idx}`}
              className="chat-quick-button"
              onClick={() => sendMessage.mutate(btn.label)}
              disabled={isStreaming}
            >
              <span>{btn.emoji}</span>
              <span>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message or use voice commands..."
          className="chat-input"
          disabled={isStreaming}
        />
        <button type="submit" disabled={isStreaming || !input.trim()} className="chat-send-button">
          ✈️
        </button>
      </form>
    </div>
  );
}
