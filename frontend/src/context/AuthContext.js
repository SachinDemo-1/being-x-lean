import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const API = process.env.REACT_APP_API_URL ;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setThemeState] = useState('dark-fire');

  useEffect(() => {
    const token = localStorage.getItem('fitppl_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get(`${API}/user/profile`)
        .then(res => {
          setUser(res.data.user);
          setThemeState(res.data.user.theme || 'dark-fire');
        })
        .catch(() => localStorage.removeItem('fitppl_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem('fitppl_token', res.data.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    setUser(res.data.user);
    setThemeState(res.data.user.theme || 'dark-fire');
    return res.data.user;
  };

  const register = async (name, email, password) => {
    const res = await axios.post(`${API}/auth/register`, { name, email, password });
    localStorage.setItem('fitppl_token', res.data.token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
    setUser(res.data.user);
    setThemeState(res.data.user.theme || 'dark-fire');
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('fitppl_token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setThemeState('dark-fire');
  };

  const updateTheme = async (newTheme) => {
    setThemeState(newTheme);
    if (user) {
      try {
        const res = await axios.put(`${API}/user/theme`, { theme: newTheme });
        setUser(res.data.user);
      } catch (e) { console.error(e); }
    }
  };

  const loginWithGoogle = () => {
    window.location.href = `${API}/auth/google`;
  };

  const loginWithFacebook = () => {
    window.location.href = `${API}/auth/facebook`;
  };

  return (
    <AuthContext.Provider value={{ user, loading, theme, login, register, logout, updateTheme, loginWithGoogle, loginWithFacebook, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
