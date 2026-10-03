import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check token on mount and fetch user profile
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await api.get('/auth/me', { suppressToast: true });
          const userData = response.data?.data || response.data;
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.warn('Token validation failed:', error);
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (identifier, password) => {
    // Demo object fallback
    if (typeof identifier === 'object' && identifier !== null) {
      setUser(identifier);
      localStorage.setItem('token', 'demo-token');
      return identifier;
    }

    try {
      const response = await api.post('/auth/login', {
        identifier,
        email: identifier,
        phone: identifier,
        password,
      });

      const resData = response.data?.data || response.data;
      const token = resData.token;
      const userData = resData.user || resData;

      if (token) {
        localStorage.setItem('token', token);
      }
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('AuthContext login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};