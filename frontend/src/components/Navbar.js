import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); setMenuOpen(false); };
  const isActive = (path) => location.pathname === path;
  const close = () => setMenuOpen(false);

  const handleAuthNav = (path) => {
    close();
    if (!user) { navigate('/auth'); return; }
    navigate(path);
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-inner">
        <Link to="/" className="nav-logo" onClick={close}>
          <img className='logo-icon' src='/images/beingxlean.jpg' alt='logo' />
          <span className="logo-text">BEING<span className="logo-accent">_X_</span>LEAN</span>
        </Link>

        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          <span className={menuOpen ? 'open' : ''}></span>
          <span className={menuOpen ? 'open' : ''}></span>
          <span className={menuOpen ? 'open' : ''}></span>
        </button>

        <div className={`nav-links ${menuOpen ? 'mobile-open' : ''}`}>
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`} onClick={close}>Home</Link>
          <button className={`nav-link nav-link-btn ${isActive('/workout') ? 'active' : ''}`} onClick={() => handleAuthNav('/workout')}>Workout</button>
          <button className={`nav-link nav-link-btn ${isActive('/diet') ? 'active' : ''}`} onClick={() => handleAuthNav('/diet')}>Diet</button>
          <button className={`nav-link nav-link-btn ${isActive('/tracker') ? 'active' : ''}`} onClick={() => handleAuthNav('/tracker')}>Tracker</button>
          <Link to="/pricing" className={`nav-link ${isActive('/pricing') ? 'active' : ''}`} onClick={close}>
            <span className="nav-pricing-badge">₹</span> Plans
          </Link>

          {user ? (
            <>
              <Link to="/profile" className={`nav-link ${isActive('/profile') ? 'active' : ''}`} onClick={close}>
                <span className="nav-avatar">
                  {user.avatar ? <img src={user.avatar} alt={user.name} /> : user.name.charAt(0).toUpperCase()}
                </span>
                {user.name.split(' ')[0]}
              </Link>
              <button className="btn-outline nav-logout" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <Link to="/auth" className="btn-primary nav-cta" onClick={close}>Sign In</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
