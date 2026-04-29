import { useState } from 'react';
import './Auth.css';

const API_BASE = import.meta.env.VITE_API_URL || "";

// validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[!@#$&*])(?=.*[0-9])(?=.*[a-z]).{8,}$/;

export default function Auth({ onLogin }) {
  const [view, setView] = useState('login'); // 'login', 'signup', 'forgot'
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // live validation as user types
  const [validation, setValidation] = useState({ email: true, password: true });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
    
    // Live validation
    if (name === 'email') {
      setValidation(prev => ({ ...prev, email: value === '' || EMAIL_REGEX.test(value) }));
    }
    if (name === 'password') {
      setValidation(prev => ({ ...prev, password: value === '' || PASSWORD_REGEX.test(value) }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // check if valid before submit
    if (!EMAIL_REGEX.test(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (view !== 'forgot' && !PASSWORD_REGEX.test(formData.password)) {
      setError("Password must be at least 8 chars, with 1 uppercase, 1 lowercase, 1 number, and 1 special character (!@#$&*).");
      return;
    }

    if (view === 'signup' && !formData.name.trim()) {
      setError("Name is required for sign up.");
      return;
    }

    setLoading(true);

    try {
      if (view === 'login') {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ email: formData.email, password: formData.password })
        });
        const data = await res.json();
        
        if (res.ok) {
          onLogin(data.email);
        } else {
          setError(data.error || "Login failed");
        }
      } 
      else if (view === 'signup') {
        const res = await fetch(`${API_BASE}/api/auth/signup`, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ email: formData.email, password: formData.password, name: formData.name })
        });
        const data = await res.json();
        
        if (res.ok) {
          setSuccess("Account successfully created! Please log in.");
          setView('login');
          setFormData({ ...formData, password: '' });
        } else {
          setError(data.error || "Signup failed");
        }
      } 
      else if (view === 'forgot') {
        const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email })
        });
        const data = await res.json();
        if (res.ok) {
          setSuccess('✅ Password reset email sent! Please check your inbox.');
          setTimeout(() => setView('login'), 4000);
        } else {
          setError(data.error || 'Could not send reset email. Check server configuration.');
        }
      }
    } catch (err) {
      setError("Could not connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        
        <div className="auth-header">
          <div className="auth-logo">🔒</div>
          <h1 className="auth-title">
            {view === 'login' ? 'Welcome Back' : view === 'signup' ? 'Create Account' : 'Reset Password'}
          </h1>
          <p className="auth-subtitle">
            {view === 'login' ? 'Enter your credentials to access the dashboard' : 
             view === 'signup' ? 'Join the staff notification portal' : 
             'Enter your registered email to receive a reset link'}
          </p>
        </div>

        {error && <div className="error-banner">{error}</div>}
        {success && <div className="success-banner">{success}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          
          {view === 'signup' && (
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input 
                type="text" 
                name="name"
                className="auth-input" 
                placeholder="e.g. Shalika Aafrin"
                value={formData.name}
                onChange={handleChange}
                required 
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input 
              type="email" 
              name="email"
              className={`auth-input ${!validation.email ? 'invalid' : ''}`} 
              placeholder="staff@edunotify.com"
              value={formData.email}
              onChange={handleChange}
              required 
            />
          </div>

          {view !== 'forgot' && (
            <div className="input-group">
              <label className="input-label">Password</label>
              <input 
                type="password" 
                name="password"
                className={`auth-input ${!validation.password ? 'invalid' : ''}`} 
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required 
              />
            </div>
          )}

          {view === 'login' && (
            <div className="auth-options">
              <button type="button" className="forgot-link" onClick={() => { setView('forgot'); setError(''); setSuccess(''); }}>
                Forgot Password?
              </button>
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? <span className="spinner"></span> : 
             view === 'login' ? 'Sign In' : 
             view === 'signup' ? 'Sign Up' : 
             'Send Reset Link'}
          </button>

        </form>

        <div className="auth-switch">
          {view === 'login' ? (
            <>
              New to EduNotify? 
              <button type="button" className="auth-switch-link" onClick={() => { setView('signup'); setError(''); }}>
                Create an account
              </button>
            </>
          ) : view === 'signup' ? (
            <>
              Already have an account? 
              <button type="button" className="auth-switch-link" onClick={() => { setView('login'); setError(''); }}>
                Sign In
              </button>
            </>
          ) : (
            <>
              Remember your password? 
              <button type="button" className="auth-switch-link" onClick={() => { setView('login'); setError(''); }}>
                Back to Login
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
