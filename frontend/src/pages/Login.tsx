import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../api/client';
import './Login.css';

/** Always returns a displayable string — never an object that would crash React */
function extractError(err: any): string {
  console.error('🔴 [Login Error Logged to Inspect Console]:', err);
  if (err?.response) {
    console.error('🔴 [HTTP Response Status]:', err.response.status);
    console.error('🔴 [HTTP Response Data]:', err.response.data);
  }

  const data = err?.response?.data;
  if (!data) return err?.message || 'Something went wrong. Please try again.';

  // Backend returns { error: string } normally
  if (typeof data.error === 'string') return data.error;

  // If error is an object (e.g. Prisma leak {code, message})
  if (typeof data.error === 'object' && data.error?.message) return String(data.error.message);

  // Fallback
  if (typeof data === 'string') return data;
  if (typeof data.message === 'string') return data.message;

  return 'Something went wrong. Please try again.';
}

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const { setAuth } = useAuthStore();

  // Navigate without a full page reload so Zustand state is preserved
  const goToDashboard = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const response = await apiClient.post('/auth/login', { email, password });
      setAuth(response.data.token, response.data.user);
      goToDashboard();
    } catch (err: any) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const response = await apiClient.post('/auth/signup', { name, email, password, dob });
      if (response.data.token && response.data.user) {
        setAuth(response.data.token, response.data.user);
        setInfoMessage('Account created! Redirecting...');
        // Give Zustand persist a tick to write to localStorage, then navigate
        setTimeout(goToDashboard, 300);
      } else {
        setInfoMessage(response.data.message || 'Registration successful! Please log in.');
        setIsSignUp(false);
      }
    } catch (err: any) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      setInfoMessage(response.data.message || 'Password reset link sent to your email.');
    } catch (err: any) {
      setError(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-backdrop">
        <div className="pink-orb orb-1"></div>
        <div className="pink-orb orb-2"></div>
      </div>

      <div className="login-card glass-card">
        <div className="login-header">
          <div className="login-logo">
            <img src="/gurlz-logo.jpg" alt="GURLZ" className="login-logo-img pulse-logo" />
          </div>
          <h1 className="brand-title">GURLZ</h1>
          <p className="login-subtitle">AI-POWERED WOMEN'S WELLNESS COMPANION</p>
        </div>

        {isForgot ? (
          <form onSubmit={handleForgot} className="login-form">
            <h2 className="form-heading">Reset Password</h2>
            <p className="form-subtext">Enter your registered email to receive a password reset link.</p>

            <div className="form-group">
              <label htmlFor="reset-email">Email Address</label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@gurlz.ai"
              />
            </div>

            {error && <div className="error-message">⚠️ {error}</div>}
            {infoMessage && <div className="info-message">✨ {infoMessage}</div>}

            <button type="submit" disabled={loading} className="login-button glow-button">
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </button>

            <button
              type="button"
              className="toggle-auth-btn"
              onClick={() => { setIsForgot(false); setError(''); setInfoMessage(''); }}
            >
              Back to Login
            </button>
          </form>
        ) : isSignUp ? (
          <form onSubmit={handleSignUp} className="login-form">
            <h2 className="form-heading">Create Account</h2>

            <div className="form-group">
              <label htmlFor="name">Your Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Sophia"
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-email">Email Address</label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="sophia@example.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Min 6 characters"
              />
            </div>

            <div className="form-group">
              <label htmlFor="dob">Date of Birth (Optional)</label>
              <input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>

            {error && <div className="error-message">⚠️ {error}</div>}
            {infoMessage && <div className="info-message">✨ {infoMessage}</div>}

            <button type="submit" disabled={loading} className="login-button glow-button">
              {loading ? 'Creating Account...' : 'Sign Up with Email'}
            </button>

            <button
              type="button"
              className="toggle-auth-btn"
              onClick={() => { setIsSignUp(false); setError(''); setInfoMessage(''); }}
            >
              Already have an account? Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="login-form">
            <h2 className="form-heading">Welcome Back</h2>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>

            <div className="form-group">
              <div className="label-with-action">
                <label htmlFor="password">Password</label>
                <button
                  type="button"
                  className="forgot-link"
                  onClick={() => { setIsForgot(true); setError(''); setInfoMessage(''); }}
                >
                  Forgot?
                </button>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            {error && <div className="error-message">⚠️ {error}</div>}
            {infoMessage && <div className="info-message">✨ {infoMessage}</div>}

            <button type="submit" disabled={loading} className="login-button glow-button">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <button
              type="button"
              className="toggle-auth-btn"
              onClick={() => { setIsSignUp(true); setError(''); setInfoMessage(''); }}
            >
              Don't have an account? Create One
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
