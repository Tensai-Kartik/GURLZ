import { useState, useEffect, useRef } from 'react';
import './VoiceOrb.css';

type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export default function VoiceOrb() {
  const [state, setState] = useState<OrbState>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    // Enhanced idle animation with subtle continuous movement
    if (state === 'idle') {
      const animate = () => {
        // Subtle continuous animation handled by CSS
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state]);

  const handleOrbClick = () => {
    if (state === 'idle') {
      setState('listening');
      setIsRecording(true);
      setTimeout(() => {
        setState('thinking');
        setIsRecording(false);
      }, 3000);
      setTimeout(() => setState('speaking'), 5000);
      setTimeout(() => setState('idle'), 8000);
    } else if (state === 'listening') {
      // Stop listening
      setState('thinking');
      setIsRecording(false);
    }
  };

  return (
    <div className="voice-orb-container">
      <div
        className={`voice-orb orb-${state}`}
        onClick={handleOrbClick}
        role="button"
        tabIndex={0}
        aria-label="Voice assistant orb - Click to start voice interaction"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOrbClick();
          }
        }}
      >
        <div className="orb-inner">
          <div className="orb-core"></div>
          {state === 'listening' && (
            <>
              <div className="orb-pulse-ring"></div>
              <div className="orb-pulse-ring" style={{ animationDelay: '0.5s' }}></div>
              <div className="orb-mic-icon">🎤</div>
            </>
          )}
          {state === 'thinking' && (
            <div className="orb-particles">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="orb-particle"
                  style={
                    {
                      '--index': i,
                      '--delay': i * 0.1,
                    } as React.CSSProperties
                  }
                ></div>
              ))}
            </div>
          )}
          {state === 'speaking' && (
            <div className="orb-waveform">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="orb-wave"
                  style={{ '--delay': i * 0.1 } as React.CSSProperties}
                ></div>
              ))}
            </div>
          )}
          {state === 'error' && (
            <div className="orb-error-icon">⚠️</div>
          )}
        </div>
      </div>
      <p className="orb-instruction">
        {state === 'idle' && 'Click the orb to let magic begin ✨'}
        {state === 'listening' && 'Listening... 🎤'}
        {state === 'thinking' && 'Thinking... 💭'}
        {state === 'speaking' && 'Speaking... 🔊'}
        {state === 'error' && 'Oops! Try again ❤️'}
      </p>
    </div>
  );
}

