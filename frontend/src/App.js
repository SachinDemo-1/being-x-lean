import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { applyTheme } from './context/themes';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Workout from './pages/Workout';
import Diet from './pages/Diet';
import AuthPage from './pages/AuthPage';
import Profile from './pages/Profile';
import AuthSuccess from './pages/AuthSuccess';
import Tracker from './pages/Tracker';
import Pricing from './pages/Pricing';
import './App.css';

const AppContent = () => {
  const { theme } = useAuth();
  useEffect(() => { applyTheme(theme); }, [theme]);

  return (
    <Router>
      <div className="app-wrapper">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/workout" element={<Workout />} />
            <Route path="/diet" element={<Diet />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/auth/success" element={<AuthSuccess />} />
            <Route path="/tracker" element={<Tracker />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
