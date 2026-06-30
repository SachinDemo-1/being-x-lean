/* eslint-disable */
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_API_URL;

export default function AuthSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const token = params.get('token');
    if (token) {
      localStorage.setItem('fitppl_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get(`${API}/user/profile`)
        .then(res => {
          setUser(res.data.user);
          navigate('/');
        })
        .catch(() => navigate('/auth'));
    } else {
      navigate('/auth');
    }
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '1rem',
      color: 'var(--text-secondary)'
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid var(--border)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }}></div>
      <p>Completing sign in...</p>
    </div>
  );
}
