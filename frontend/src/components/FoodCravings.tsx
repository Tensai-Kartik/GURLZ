import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import './FoodCravings.css';

interface AlternativeItem {
  craving: string;
  alternative: string;
  benefit: string;
}

export default function FoodCravings() {
  const queryClient = useQueryClient();
  const [cravingInput, setCravingInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Delivery quick links
  const deliveryApps = [
    { name: 'Swiggy', emoji: '🧡', color: '#fc8019', url: 'https://www.swiggy.com' },
    { name: 'Zomato', emoji: '🔴', color: '#e23744', url: 'https://www.zomato.com' },
    { name: 'Blinkit', emoji: '💛', color: '#f7c942', url: 'https://blinkit.com' },
    { name: 'Zepto', emoji: '💜', color: '#7c3aed', url: 'https://www.zepto.com' },
  ];

  // Healthy craving alternatives state
  const [alternatives, setAlternatives] = useState<AlternativeItem[]>([
    { craving: 'Chocolate / Sweet', alternative: 'Dark Chocolate (70%+) with Almonds', benefit: 'Rich in magnesium to ease uterine cramps & boost mood' },
    { craving: 'Salty Snacks / Chips', alternative: 'Roasted Makhana (Fox nuts) or Pumpkin seeds', benefit: 'Provides zinc & healthy fats without sodium bloating' },
    { craving: 'Ice Cream', alternative: 'Frozen Banana & Berry Smoothie', benefit: 'Satisfies sweet cravings with potassium & natural fiber' },
    { craving: 'Fast Food / Pizza', alternative: 'Grilled Cottage Cheese / Avocado Toast', benefit: 'Sustained protein to prevent blood sugar spikes' },
  ]);

  // Log craving & fetch dynamic AI alternatives
  const logCravingMutation = useMutation({
    mutationFn: async (cravingText: string) => {
      setIsGenerating(true);
      // Log symptom craving
      await apiClient.post('/symptoms', {
        date: new Date().toISOString(),
        cravings: [cravingText],
      });

      // Query AI for custom healthier alternatives
      try {
        const aiRes = await apiClient.post('/ask-ai', {
          query: `Suggest 3 healthy, delicious food alternatives specifically for the craving: "${cravingText}". Return brief recommendations.`,
        });

        const adviceText = aiRes.data?.response || '';
        const newAlt: AlternativeItem = {
          craving: cravingText,
          alternative: `Smart Alt for ${cravingText}`,
          benefit: adviceText.slice(0, 110) + '...',
        };

        setAlternatives((prev) => [newAlt, ...prev]);
      } catch (err) {
        console.warn('AI alternative suggestion fallback:', err);
      } finally {
        setIsGenerating(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['symptoms-cravings'] });
      setCravingInput('');
    },
  });

  return (
    <div className="food-cravings-container">
      <div className="cravings-header glass-card">
        <h2>🍫 Food & Cravings Care</h2>
        <p>Discover Gemini-recommended healthy alternatives and order your comfort cravings instantly.</p>
      </div>

      {/* Log Craving Box */}
      <div className="log-craving-box glass-card">
        <h3>What are you craving right now?</h3>
        <div className="input-group">
          <input
            type="text"
            placeholder="e.g., Spicy ramen, dark chocolate..."
            value={cravingInput}
            onChange={(e) => setCravingInput(e.target.value)}
            disabled={isGenerating}
          />
          <button
            className="craving-check-btn"
            onClick={() => cravingInput.trim() && logCravingMutation.mutate(cravingInput.trim())}
            disabled={logCravingMutation.isPending || isGenerating || !cravingInput.trim()}
          >
            {isGenerating || logCravingMutation.isPending ? '✨ Checking...' : 'Check'}
          </button>
        </div>
      </div>

      {/* Healthy Alternatives Section */}
      <div className="alternatives-section">
        <h3>✨ Smart Healthy Alternatives for Your Cravings</h3>
        <div className="alternatives-grid">
          {alternatives.map((item, idx) => (
            <div key={idx} className="alt-card glass-card">
              <div className="alt-craving">Craving: <span>{item.craving}</span></div>
              <div className="alt-recommendation">💡 Try: <strong>{item.alternative}</strong></div>
              <div className="alt-benefit">{item.benefit}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Order Apps */}
      <div className="delivery-section glass-card">
        <h3>🛍️ Quick Delivery Outlets</h3>
        <p className="delivery-sub">Open your favorite app instantly to order snacks or essential groceries:</p>
        <div className="apps-grid">
          {deliveryApps.map((app) => (
            <a
              key={app.name}
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="app-btn"
              style={{ borderLeftColor: app.color }}
            >
              <span className="app-emoji">{app.emoji}</span>
              <span className="app-name">Order on {app.name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
