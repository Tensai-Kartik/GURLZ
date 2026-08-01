import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import './RightPanel.css';

interface RightPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function RightPanel({ isOpen = false, onClose }: RightPanelProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [quickNote, setQuickNote] = useState('');
  const [showAddContact, setShowAddContact] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const [showSosConfirm, setShowSosConfirm] = useState(false);
  const [sosSending, setSosSending] = useState(false);
  const [sosSuccessMsg, setSosSuccessMsg] = useState('');

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRel, setContactRel] = useState('Family');

  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Myth & Fact from backend cycling system
  const { data: funfact } = useQuery({
    queryKey: ['funfact'],
    queryFn: async () => {
      const response = await apiClient.get('/funfacts');
      return response.data;
    },
    refetchOnWindowFocus: false,
  });

  // Fetch Today's Reminders
  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const response = await apiClient.get('/reminders');
      return response.data || [];
    },
  });

  // Fetch Emergency Contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ['emergency'],
    queryFn: async () => {
      const response = await apiClient.get('/emergency');
      return response.data || [];
    },
  });

  // Add Contact Mutation
  const addContactMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string; relationship: string }) => {
      return apiClient.post('/emergency', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency'] });
      setShowAddContact(false);
      setContactName('');
      setContactPhone('');
    },
  });

  // Delete Contact Mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/emergency/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency'] });
      setDeletingContactId(null);
    },
  });

  // Save Quick Note
  const saveNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiClient.post('/notes', { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setQuickNote('');
    },
  });

  // Trigger SOS Alert
  const confirmSOS = async () => {
    setSosSending(true);
    try {
      const location = { lat: 0, lng: 0 };
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          location.lat = pos.coords.latitude;
          location.lng = pos.coords.longitude;
        });
      }
      await apiClient.post('/sos', { location });
      setSosSuccessMsg('🆘 SOS alert sent successfully to emergency contacts!');
    } catch {
      setSosSuccessMsg('Failed to send SOS alert.');
    } finally {
      setSosSending(false);
      setTimeout(() => {
        setShowSosConfirm(false);
        setSosSuccessMsg('');
      }, 2500);
    }
  };

  return (
    <aside className={`right-panel ${isOpen ? 'open' : ''}`}>
      {onClose && (
        <div className="drawer-header-mobile">
          <span className="drawer-title-mobile">🚨 Emergency & Quick Info</span>
          <button className="drawer-close-btn right" onClick={onClose} title="Close Panel">
            ✕
          </button>
        </div>
      )}
      {/* Clock Display */}
      <div className="panel-section glass-section">
        <h3 className="panel-title">⏰ Time & Date</h3>
        <div className="clock-display">
          <div className="clock-time">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="clock-date">
            {currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* SOS Button */}
      <div className="panel-section">
        <button className="sos-button glow-sos-btn" onClick={() => setShowSosConfirm(true)}>
          🆘 EMERGENCY SOS
        </button>
      </div>

      {/* Reminders Section */}
      <div className="panel-section glass-section">
        <h3 className="panel-title">🔔 Reminders</h3>
        <div className="reminders-list">
          {reminders.length > 0 ? (
            reminders.slice(0, 3).map((reminder: any) => (
              <div key={reminder.id} className="reminder-item">
                <span className="reminder-text">📌 {reminder.message}</span>
              </div>
            ))
          ) : (
            <div className="empty-state">No reminders set for today</div>
          )}
        </div>
      </div>

      {/* Emergency Contacts Section */}
      <div className="panel-section glass-section">
        <div className="section-header-flex">
          <h3 className="panel-title">🚨 Emergency Contacts</h3>
          <button className="add-mini-btn" onClick={() => setShowAddContact(true)}>+ Add</button>
        </div>

        <div className="contacts-list">
          {contacts.length > 0 ? (
            contacts.map((contact: any) => (
              <div key={contact.id} className="contact-card-item">
                <div className="contact-main">
                  <div className="contact-avatar">{contact.name.charAt(0).toUpperCase()}</div>
                  <div className="contact-info">
                    <div className="contact-name">{contact.name}</div>
                    <div className="contact-phone">{contact.phone}</div>
                  </div>
                  <button
                    className="delete-contact-btn"
                    title="Delete contact"
                    onClick={() => setDeletingContactId(contact.id)}
                  >
                    🗑️
                  </button>
                </div>
                <div className="contact-actions-row">
                  <a href={`tel:${contact.phone}`} className="action-btn call" title="Call">📞 Call</a>
                  <a href={`sms:${contact.phone}`} className="action-btn sms" title="SMS">💬 SMS</a>
                  <a
                    href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="action-btn wa"
                    title="WhatsApp"
                  >
                    🟢 WhatsApp
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">No emergency contacts saved yet</div>
          )}
        </div>
      </div>

      {/* Quick Notes */}
      <div className="panel-section glass-section">
        <h3 className="panel-title">📝 Quick Note</h3>
        <textarea
          className="quick-notes-input"
          placeholder="Jot down a quick thought..."
          rows={3}
          value={quickNote}
          onChange={(e) => setQuickNote(e.target.value)}
        />
        {quickNote && (
          <button
            className="panel-button"
            onClick={() => saveNoteMutation.mutate(quickNote.trim())}
            style={{ marginTop: '8px' }}
          >
            Save Note
          </button>
        )}
      </div>

      {/* Daily Myth & Fact */}
      <div className="panel-section glass-section">
        <h3 className="panel-title">💡 Daily Myth vs Fact</h3>
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

      {/* Delete Contact Confirmation Modal */}
      {deletingContactId && (
        <div className="cycle-modal-backdrop">
          <div className="warning-modal-card glass-card">
            <div className="warning-modal-header">
              <span className="warning-icon">⚠️</span>
              <h3>Delete Emergency Contact?</h3>
            </div>
            <p className="warning-modal-text">
              Are you sure you want to delete this emergency contact? They will be removed from your quick dial list.
            </p>
            <div className="warning-modal-actions">
              <button className="cancel-btn" onClick={() => setDeletingContactId(null)}>
                Cancel
              </button>
              <button
                className="confirm-delete-btn"
                disabled={deleteContactMutation.isPending}
                onClick={() => deleteContactMutation.mutate(deletingContactId)}
              >
                {deleteContactMutation.isPending ? 'Deleting...' : '🔥 Delete Contact'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOS Alert Warning Modal */}
      {showSosConfirm && (
        <div className="cycle-modal-backdrop">
          <div className="warning-modal-card glass-card">
            <div className="warning-modal-header">
              <span className="warning-icon">🆘</span>
              <h3>Trigger Emergency SOS Alert</h3>
            </div>
            {sosSuccessMsg ? (
              <p className="warning-modal-text" style={{ color: '#00e676', fontWeight: 'bold' }}>
                {sosSuccessMsg}
              </p>
            ) : (
              <>
                <p className="warning-modal-text">
                  This will immediately send an SOS alert with your real-time location to all saved emergency contacts.
                </p>
                <div className="warning-modal-actions">
                  <button className="cancel-btn" onClick={() => setShowSosConfirm(false)}>
                    Cancel
                  </button>
                  <button
                    className="confirm-delete-btn"
                    disabled={sosSending}
                    onClick={confirmSOS}
                    style={{ background: 'linear-gradient(135deg, #ff1744, #d50000)' }}
                  >
                    {sosSending ? 'Sending SOS...' : '🚨 Send SOS Alert Now'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="modal-backdrop">
          <div className="modal-card glass-card">
            <h3>Add Emergency Contact</h3>
            <input
              type="text"
              placeholder="Contact Name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
            <input
              type="tel"
              placeholder="Phone Number (e.g. +919876543210)"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
            <select value={contactRel} onChange={(e) => setContactRel(e.target.value)}>
              <option value="Family">Family 👨‍👩‍👧</option>
              <option value="Friend">Friend 🌸</option>
              <option value="Doctor">Doctor 🩺</option>
              <option value="Partner">Partner 💖</option>
            </select>
            <div className="modal-actions">
              <button onClick={() => setShowAddContact(false)}>Cancel</button>
              <button
                className="confirm-btn"
                onClick={() =>
                  contactName && contactPhone && addContactMutation.mutate({ name: contactName, phone: contactPhone, relationship: contactRel })
                }
              >
                Save Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
