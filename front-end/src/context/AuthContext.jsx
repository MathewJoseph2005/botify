import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Verify token on mount & when token changes
  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      try {
        console.log('[AuthContext] Verifying token...');
        const response = await authAPI.verify();
        if (response.data.success) {
          console.log('[AuthContext] Token verified successfully');
          setUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        } else {
          console.warn('[AuthContext] Token verification failed:', response.data.message);
          logout();
        }
      } catch (err) {
        console.error('[AuthContext] Token verification error:', err.response?.data?.message || err.message);
        logout();
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, [token]);

  const login = useCallback((newToken, userData) => {
    console.log('[AuthContext] Logging in user:', userData);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    console.log('[AuthContext] Logging out');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = !!token && !!user;

  const getRoleName = (roleId) => {
    const roles = { 1: 'admin', 2: 'seller', 3: 'buyer' };
    return roles[roleId] || 'buyer';
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    logout,
    getRoleName,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
