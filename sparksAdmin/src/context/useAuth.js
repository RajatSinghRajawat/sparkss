import { createContext, useContext } from 'react';

/**
 * Kept out of AuthContext.jsx so that file exports only the provider
 * component — mixing hooks and components in one module breaks Fast Refresh.
 */
export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
