/* eslint-disable */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

import axios from 'axios';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, loginWithGoogle, loginWithFacebook, setUser } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSendEmailOtp = async () => {
    if (!form.email) { setError('Enter your email'); return; }
    setLoading(true);
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/auth/send-email-otp`, {
        email: form.email, name: form.name
      });
      setOtpSent(true);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        if (!otpSent) { await handleSendEmailOtp(); setLoading(false); return; }
        const res = await axios.post(`${process.env.REACT_APP_API_URL}/auth/verify-email-otp`, {
          name: form.name, email: form.email, password: form.password, otp
        });
        // store token and user directly — don't call login() which would
        // make a second /auth/login API call and fail
        localStorage.setItem('fitppl_token', res.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        setUser(res.data.user);
        navigate('/');
        return;
      }
      if (mode === 'login') {
        await login(form.email, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="noise-overlay" />
      <div className="auth-bg">
        <div className="auth-orb orb-a"></div>
        <div className="auth-orb orb-b"></div>
      </div>

      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-bolt">⚡</span>
          <span className="auth-logo-text">BEING<span>_X_</span>LEAN</span>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); setOtpSent(false); }}>Sign In</button>
          <button className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); setError(''); setOtpSent(false); }}>Create Account</button>
        </div>

        <h1 className="auth-title">{mode === 'login' ? 'Welcome Back 💪' : 'Join The Iron Family 🔥'}</h1>
        <p className="auth-subtitle">
          {mode === 'login' ? 'Sign in to access your workout plan, diet plan, and progress tracker.' : 'Create your free account and start building your best physique.'}
        </p>

        {error && <div className="auth-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your name" required />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="••••••••" required minLength={6} />
          </div>
          {mode === 'register' && otpSent && (
            <div className="form-group">
              <label>Enter OTP sent to {form.email}</label>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="6-digit OTP"
                maxLength={6}
              />
            </div>
          )}

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? '⏳ Please wait...' : mode === 'login' ? '⚡ Sign In' : '🚀 Create Account'}
          </button>
        </form>

        <div className="auth-divider"><span>or continue with</span></div>

        <div className="social-buttons">
          <button className="social-btn google-btn" onClick={loginWithGoogle}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <button className="social-btn facebook-btn" onClick={loginWithFacebook}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Continue with Facebook
          </button>
        </div>

        <p className="auth-switch">
          {mode === 'login' ? (
            <>Don't have an account? <button onClick={() => setMode('register')}>Sign up free</button></>
          ) : (
            <>Already have an account? <button onClick={() => setMode('login')}>Sign in</button></>
          )}
        </p>

        <Link to="/" className="auth-back">← Back to Home</Link>
      </div>
    </div>
  );
}