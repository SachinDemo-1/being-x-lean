import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { THEMES } from '../context/themes';
import './Profile.css';

export default function Profile() {
  const { user, theme, updateTheme, logout } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!user) {
    return (
      <div className="profile-unauth">
        <div className="noise-overlay" />
        <div className="unauth-card">
          <span style={{ fontSize: '3rem' }}>🔒</span>
          <h2>Sign In Required</h2>
          <p>You need to be logged in to view your profile.</p>
          <button className="btn-primary" onClick={() => navigate('/auth')}>Sign In</button>
        </div>
      </div>
    );
  }

  const handleThemeSelect = async (themeName) => {
    setSaving(true);
    await updateTheme(themeName);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="profile-page">
      <div className="noise-overlay" />
      <div className="profile-bg">
        <div className="profile-orb"></div>
      </div>

      <div className="profile-container">
        {/* Header */}
        <div className="profile-header">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              {user.avatar
                ? <img src={user.avatar} alt={user.name} />
                : <span>{user.name.charAt(0).toUpperCase()}</span>
              }
            </div>
            <div className="avatar-glow"></div>
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{user.name}</h1>
            <p className="profile-email">{user.email}</p>
            <span className="profile-joined">Member since {joinDate}</span>
          </div>
        </div>

        {/* Theme Picker */}
        <div className="profile-section">
          <div className="section-header">
            <div>
              <h2 className="section-title" style={{ fontSize: '1.8rem' }}>🎨 THEME</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
                Choose your workout interface theme
              </p>
            </div>
            {saving && <span className="save-badge saving">Saving...</span>}
            {saved && <span className="save-badge saved">✓ Saved!</span>}
          </div>

          <div className="themes-grid">
            {Object.entries(THEMES).map(([key, t]) => (
              <button
                key={key}
                className={`theme-card ${theme === key ? 'active' : ''}`}
                onClick={() => handleThemeSelect(key)}
                style={{
                  '--t-accent': t['--accent'],
                  '--t-bg': t['--bg-card'],
                  '--t-border': t['--border'],
                }}
              >
                <div className="theme-preview">
                  <div className="tp-bg" style={{ background: t['--bg-primary'] }}>
                    <div className="tp-card" style={{ background: t['--bg-card'], borderColor: t['--border'] }}>
                      <div className="tp-bar" style={{ background: `linear-gradient(90deg, ${t['--accent']}, ${t['--accent2']})` }}></div>
                      <div className="tp-line" style={{ background: t['--text-secondary'], opacity: 0.4 }}></div>
                      <div className="tp-line short" style={{ background: t['--text-secondary'], opacity: 0.25 }}></div>
                    </div>
                  </div>
                </div>
                <span className="theme-label">{t.label}</span>
                {theme === key && <span className="theme-check">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Account Info */}
        <div className="profile-section">
          <h2 className="section-title" style={{ fontSize: '1.8rem' }}>👤 ACCOUNT</h2>
          <div className="account-info">
            <div className="info-row">
              <span className="info-label">Name</span>
              <span className="info-value">{user.name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email</span>
              <span className="info-value">{user.email}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Auth Method</span>
              <span className="info-value">{user.googleId ? '🔵 Google' : '📧 Email'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Active Theme</span>
              <span className="info-value">{THEMES[theme]?.label || theme}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="profile-actions">
          <button className="btn-outline danger-btn" onClick={handleLogout}>
            🚪 Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
