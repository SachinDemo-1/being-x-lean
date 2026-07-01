import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BackButton.css';

// Shown on every page except Home, top-left, under the navbar.
export default function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === '/') return null;

  const handleBack = () => {
    // Go back in browser history if possible, otherwise fall back to Home.
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <button className="back-btn" onClick={handleBack} aria-label="Go back">
      <span className="back-btn-arrow">←</span>
      <span className="back-btn-label">Back</span>
    </button>
  );
}