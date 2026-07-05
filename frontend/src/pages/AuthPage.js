/* eslint-disable */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

import axios from 'axios';
import { auth } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [authMethod, setAuthMethod] = useState('email'); // 'email' | 'phone'
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }
  };

  const handleSendOtp = async () => {
    if (!form.phone || form.phone.length < 10) {
      setError('Enter a valid 10-digit phone number'); return;
    }
    setLoading(true);
    try {
      setupRecaptcha();
      const result = await signInWithPhoneNumber(auth, `+91${form.phone}`, window.recaptchaVerifier);
      setConfirmationResult(result);
      setOtpSent(true);
      setError('');
    } catch (err) {
      // Log the real Firebase error code/message so the actual cause
      // (e.g. auth/invalid-app-credential, auth/unauthorized-domain,
      // billing-not-enabled, recaptcha domain mismatch) is visible in
      // the browser console instead of being hidden behind a generic message.
      console.error('Phone OTP error:', err.code, err.message);
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch (e) {}
      }
      window.recaptchaVerifier = null;
      setError(
        err.code === 'auth/unauthorized-domain'
          ? 'This domain is not authorized for phone sign-in. Add it under Firebase Console → Authentication → Settings → Authorized domains.'
          : err.code === 'auth/invalid-app-credential' || err.code === 'auth/captcha-check-failed'
            ? 'reCAPTCHA verification failed. Check your reCAPTCHA site key domain settings in Firebase/Google Cloud Console.'
            : 'Failed to send OTP. Try again.'
      );
    } finally { setLoading(false); }
  };

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
      if (authMethod === 'phone') {
        if (!otpSent) { await handleSendOtp(); setLoading(false); return; }
        const result = await confirmationResult.confirm(otp);
        const idToken = await result.user.getIdToken();
        const res = await axios.post(`${process.env.REACT_APP_API_URL}/auth/verify-phone-token`, {
          idToken, name: form.name
        });
        login(res.data.token, res.data.user);
        navigate('/');
        return;
      }
      if (authMethod === 'email' && mode === 'register') {
        if (!otpSent) { await handleSendEmailOtp(); setLoading(false); return; }
        const res = await axios.post(`${process.env.REACT_APP_API_URL}/auth/verify-email-otp`, {
          name: form.name, email: form.email, password: form.password, otp
        });
        login(res.data.token, res.data.user);
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

        {/* Auth Method Toggle */}
        <div className="auth-method-toggle">
          <button className={`method-btn ${authMethod === 'email' ? 'active' : ''}`} onClick={() => { setAuthMethod('email'); setOtpSent(false); setError(''); }}>📧 Email</button>
          <button className={`method-btn ${authMethod === 'phone' ? 'active' : ''}`} onClick={() => { setAuthMethod('phone'); setOtpSent(false); setError(''); }}>📱 Phone</button>
        </div>

        {error && <div className="auth-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your name" required />
            </div>
          )}

          {authMethod === 'email' ? (
            <>
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="••••••••" required minLength={6} />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Phone Number</label>
                <div className="phone-input-wrap">
                  <span className="phone-prefix">+91</span>
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="9876543210" maxLength={10} />
                </div>
              </div>
              {otpSent && (
                <div className="form-group">
                  <label>Enter OTP</label>
                  <input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit OTP" maxLength={6} />
                  <p className="otp-hint">OTP sent to +91 {form.phone}</p>
                </div>
              )}
              {!otpSent && (
                <button type="button" className="btn-outline otp-btn" onClick={handleSendOtp} disabled={loading}>
                  {loading ? '⏳ Sending...' : '📲 Send OTP'}
                </button>
              )}
            </>
          )}
          {authMethod === 'email' && mode === 'register' && otpSent && (
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

        {/* Social Login Buttons */}
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

          <button className="social-btn facebook-btn" disabled title="Facebook login is temporarily unavailable" style={{opacity:0.45, cursor:'not-allowed', filter:'grayscale(1)'}}>
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
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}