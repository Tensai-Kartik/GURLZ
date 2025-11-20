import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import './RightPanel.css';

export default function RightPanel() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [quickNote, setQuickNote] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: funfact } = useQuery({
    queryKey: ['funfact'],
    queryFn: async () => {
      const response = await apiClient.get('/funfacts');
      return response.data;
    },
    refetchInterval: 86400000, // Once per day
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const response = await apiClient.get('/reminders');
      return response.data || [];
    },
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['emergency'],
    queryFn: async () => {
      const response = await apiClient.get('/emergency');
      return response.data || [];
    },
  });

  const saveNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiClient.post('/notes', { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setQuickNote('');
    },
  });

  const handleSOS = async () => {
    if (confirm('Are you sure you want to trigger an SOS alert?')) {
      try {
        const location = { lat: 0, lng: 0 };
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              location.lat = position.coords.latitude;
              location.lng = position.coords.longitude;
            },
            () => {
              // Use default if geolocation fails
            }
          );
        }
        
        await apiClient.post('/sos', { location });
        alert('SOS alert sent to emergency contacts!');
      } catch (error) {
        alert('Failed to send SOS alert');
      }
    }
  };

  const handleSaveNote = () => {
    if (quickNote.trim()) {
      saveNoteMutation.mutate(quickNote.trim());
    }
  };

  return (
    <aside className="right-panel">
      <div className="panel-section">
        <h3 className="panel-title">Clock & Date</h3>
        <div className="clock-display">
          <div className="clock-time">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="clock-date">
            {currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="panel-section">
        <h3 className="panel-title">Reminders</h3>
        <div className="reminders-list">
          {reminders.length > 0 ? (
            reminders.slice(0, 3).map((reminder: any) => (
              <div key={reminder.id} className="reminder-item">
                <span className="reminder-time">
                  {reminder.nextRun
                    ? new Date(reminder.nextRun).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '--:--'}
                </span>
                <span className="reminder-text">{reminder.message}</span>
              </div>
            ))
          ) : (
            <div className="empty-state">No reminders yet</div>
          )}
        </div>
        <button className="panel-button" onClick={() => {
          const message = prompt('Reminder message:');
          const time = prompt('Time (HH:MM):');
          if (message && time) {
            const [hours, minutes] = time.split(':');
            const nextRun = new Date();
            nextRun.setHours(parseInt(hours), parseInt(minutes), 0);
            apiClient.post('/reminders', {
              type: 'general',
              message,
              nextRun: nextRun.toISOString(),
            }).then(() => {
              queryClient.invalidateQueries({ queryKey: ['reminders'] });
            });
          }
        }}>
          + Add Reminder
        </button>
      </div>

      <div className="panel-section">
        <h3 className="panel-title">Emergency Contacts</h3>
        <div className="contacts-list">
          {contacts.length > 0 ? (
            contacts.slice(0, 3).map((contact: any) => (
              <div key={contact.id} className="contact-item">
                <div className="contact-avatar">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div className="contact-info">
                  <div className="contact-name">{contact.name}</div>
                  <div className="contact-phone">{contact.phone}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">No contacts yet</div>
          )}
        </div>
        <button className="panel-button" onClick={() => {
          const name = prompt('Contact name:');
          const phone = prompt('Phone number:');
          if (name && phone) {
            apiClient.post('/emergency', { name, phone }).then(() => {
              queryClient.invalidateQueries({ queryKey: ['emergency'] });
            });
          }
        }}>
          + Add Contact
        </button>
      </div>

      <div className="panel-section">
        <button className="sos-button" onClick={handleSOS}>
          🆘 SOS
        </button>
      </div>

      <div className="panel-section">
        <h3 className="panel-title">Quick Notes</h3>
        <textarea
          className="quick-notes-input"
          placeholder="Write a quick note..."
          rows={3}
          value={quickNote}
          onChange={(e) => setQuickNote(e.target.value)}
          onBlur={handleSaveNote}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              handleSaveNote();
            }
          }}
        />
        {quickNote && (
          <button
            className="panel-button"
            onClick={handleSaveNote}
            style={{ marginTop: '8px' }}
          >
            Save Note
          </button>
        )}
      </div>

      <div className="panel-section">
        <h3 className="panel-title">Daily Myth & Fact</h3>
        {funfact && (
          <div className="funfact-card">
            <div className="funfact-myth">
              <strong>Myth:</strong> {funfact.myth}
            </div>
            <div className="funfact-fact">
              <strong>Fact:</strong> {funfact.fact}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

