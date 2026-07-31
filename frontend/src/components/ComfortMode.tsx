import { useState, useEffect, useRef } from 'react';
import './ComfortMode.css';

const AFFIRMATIONS = [
  "My body is wise, resilient, and capable of gentle healing.",
  "I give myself full permission to rest and honor my natural rhythm.",
  "Every breath I take releases tension and brings soft warmth inside.",
  "I am worthy of peace, comfort, and unconditional self-love today.",
  "Softness is my strength, and calm is my sanctuary.",
];

export default function ComfortMode() {
  const [activeSound, setActiveSound] = useState<'none' | 'rain' | 'cafe' | 'humming'>('none');
  const [affirmationIdx, setAffirmationIdx] = useState(0);
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Idle' | 'Inhale' | 'Hold' | 'Exhale'>('Idle');
  const [voicePlaying, setVoicePlaying] = useState(false);

  // Audio Context for Ambient Procedural Soundscapes (100% offline reliable sound generator)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);

  // Guided Breathing Timer (3s inhale, 3s hold, 3s exhale = 9s total round)
  useEffect(() => {
    if (!isBreathingActive) {
      setBreathPhase('Idle');
      return;
    }

    setBreathPhase('Inhale');
    let step = 0;
    const interval = setInterval(() => {
      step = (step + 1) % 3;
      if (step === 0) setBreathPhase('Inhale');
      else if (step === 1) setBreathPhase('Hold');
      else setBreathPhase('Exhale');
    }, 3000);

    return () => clearInterval(interval);
  }, [isBreathingActive]);

  const handleOrbClick = () => {
    setIsBreathingActive((prev) => !prev);
  };

  // Ambient Sound Generator via Web Audio API
  const toggleSound = (soundType: 'rain' | 'cafe' | 'humming') => {
    if (activeSound === soundType) {
      stopSound();
      setActiveSound('none');
      return;
    }

    stopSound();
    setActiveSound(soundType);

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      if (soundType === 'rain') {
        // Pink noise generator for soothing rain
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
          b6 = white * 0.115926;
        }
      } else if (soundType === 'humming') {
        // Soft warm low-frequency sine hum
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(136.1, ctx.currentTime); // Om / soothing frequency
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        noiseNodeRef.current = osc;
        return;
      } else {
        // Soft cafe background noise
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.02;
        }
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);

      noise.connect(gainNode);
      gainNode.connect(ctx.destination);
      noise.start();
      noiseNodeRef.current = noise;
    } catch {
      // Audio context fallback
    }
  };

  const stopSound = () => {
    if (noiseNodeRef.current) {
      try {
        (noiseNodeRef.current as any).stop?.();
      } catch {}
      noiseNodeRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
  };

  // Relaxing Speech Synthesis for Positive Affirmations
  const playVoiceAffirmation = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = AFFIRMATIONS[affirmationIdx];
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.pitch = 1.1;
      setVoicePlaying(true);
      utterance.onend = () => setVoicePlaying(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const nextAffirmation = () => {
    setAffirmationIdx((prev) => (prev + 1) % AFFIRMATIONS.length);
  };

  return (
    <div className="comfort-container">
      {/* Warm Ambient Header */}
      <div className="comfort-header">
        <span className="comfort-icon">🕯️</span>
        <h2>Comfort Space</h2>
        <p>A soft, warm sanctuary designed for quiet rest, deep breathing, and peace.</p>
      </div>

      {/* Guided Breathing Circle */}
      <div className="breathing-section glass-box">
        <h3>Guided Breathing</h3>
        <div
          key={isBreathingActive ? breathPhase : 'idle'}
          className={`breathing-circle ${isBreathingActive ? breathPhase.toLowerCase() : 'idle'}`}
          onClick={handleOrbClick}
          role="button"
          tabIndex={0}
          title={isBreathingActive ? "Click to pause" : "Click to start breathing"}
        >
          <div className="inner-orb"></div>
          <span className="breath-text">
            {isBreathingActive ? breathPhase : 'Click to Start'}
          </span>
        </div>
        <p className="breath-instruction">
          {isBreathingActive
            ? 'Inhale peace... Hold softly... Exhale tension...'
            : 'Tap the orb to start your guided breathing session ✨'}
        </p>
      </div>

      {/* Positive Affirmation Rotator */}
      <div className="affirmation-section glass-box">
        <div className="affirmation-header">
          <span>✨ Daily Affirmation</span>
          <button className="voice-btn" onClick={playVoiceAffirmation}>
            {voicePlaying ? '🔊 Speaking...' : '🔊 Listen'}
          </button>
        </div>
        <blockquote className="affirmation-quote">
          "{AFFIRMATIONS[affirmationIdx]}"
        </blockquote>
        <button className="next-quote-btn" onClick={nextAffirmation}>
          Next Affirmation ✨
        </button>
      </div>

      {/* Ambient Soundscapes */}
      <div className="soundscapes-section glass-box">
        <h3>Relaxing Soundscapes</h3>
        <p className="sound-sub">Select a soothing ambient background sound:</p>
        <div className="sound-buttons">
          <button
            className={`sound-card ${activeSound === 'rain' ? 'active' : ''}`}
            onClick={() => toggleSound('rain')}
          >
            <span className="sound-icon">🌧️</span>
            <span className="sound-name">Gentle Rain</span>
          </button>
          <button
            className={`sound-card ${activeSound === 'humming' ? 'active' : ''}`}
            onClick={() => toggleSound('humming')}
          >
            <span className="sound-icon">🎶</span>
            <span className="sound-name">Warm Humming</span>
          </button>
          <button
            className={`sound-card ${activeSound === 'cafe' ? 'active' : ''}`}
            onClick={() => toggleSound('cafe')}
          >
            <span className="sound-icon">☕</span>
            <span className="sound-name">Cozy Cafe</span>
          </button>
        </div>
      </div>
    </div>
  );
}
