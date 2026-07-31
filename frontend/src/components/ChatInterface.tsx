import { useState, useRef, useEffect } from 'react';
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

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
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
        // Try streaming first — use relative URL (Vite proxy handles routing)
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
                    return;
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
          }
        } else {
          // Fallback to non-streaming
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

  const quickButtons = [
    { label: 'Track Period', emoji: '📅' },
    { label: 'Log Symptoms', emoji: '😔' },
    { label: 'Find Food', emoji: '🍫' },
    { label: 'Play Music', emoji: '🎵' },
  ];

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

      <div className="chat-quick-buttons">
        {quickButtons.map((btn, idx) => (
          <button
            key={idx}
            className="chat-quick-button"
            onClick={() => sendMessage.mutate(btn.label)}
            disabled={isStreaming}
          >
            <span>{btn.emoji}</span>
            <span>{btn.label}</span>
          </button>
        ))}
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

