import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('nts_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('nts_token') || null);
  const [loading, setLoading] = useState(true);

  // Validate session on load
  useEffect(() => {
    const verifyUser = async () => {
      if (token) {
        try {
          const res = await authApi.getProfile();
          if (res.data && res.data.user) {
            setUser(res.data.user);
            localStorage.setItem('nts_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.error('Session expired or invalid:', err);
          logout();
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, [token]);

  const register = async (formData) => {
    const res = await authApi.register(formData);
    const { token: newToken, user: newUser } = res.data;

    localStorage.setItem('nts_token', newToken);
    localStorage.setItem('nts_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const login = async (email, password, portal) => {
    const res = await authApi.login({ email, password, portal });
    const { token: newToken, user: newUser } = res.data;

    localStorage.setItem('nts_token', newToken);
    localStorage.setItem('nts_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    localStorage.removeItem('nts_token');
    localStorage.removeItem('nts_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('nts_user', JSON.stringify(updatedUser));
  };

  const isAdmin = user?.role === 'admin';
  const isEmployee = user?.role === 'employee';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUser,
        isAdmin,
        isEmployee
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

