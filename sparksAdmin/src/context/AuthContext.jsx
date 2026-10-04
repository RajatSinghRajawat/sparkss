import { useState, useEffect } from 'react';
import { endpoints } from '../services/api';
import { AuthContext } from './useAuth';

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(() => {
    const saved = localStorage.getItem('eduspark_admin_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('eduspark_admin_token') || null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    localStorage.removeItem('eduspark_admin_token');
    localStorage.removeItem('eduspark_admin_user');
    setToken(null);
    setAdmin(null);
  };

  useEffect(() => {
    const verifySession = async () => {
      if (token) {
        try {
          const res = await endpoints.auth.getMe();
          if (res.data?.success && res.data?.data?.admin) {
            setAdmin(res.data.data.admin);
            localStorage.setItem('eduspark_admin_user', JSON.stringify(res.data.data.admin));
          }
        } catch {
          // Token expired or invalid
          logout();
        }
      }
      setLoading(false);
    };
    verifySession();
  }, [token]);

  const login = async (email, password) => {
    const res = await endpoints.auth.login({ email, password });
    if (res.data?.success) {
      const { token: receivedToken, admin: adminData } = res.data.data;
      localStorage.setItem('eduspark_admin_token', receivedToken);
      localStorage.setItem('eduspark_admin_user', JSON.stringify(adminData));
      setToken(receivedToken);
      setAdmin(adminData);
      return res.data;
    }
    throw new Error(res.data?.message || 'Login failed');
  };

  return (
    <AuthContext.Provider value={{ admin, token, login, logout, loading, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};
