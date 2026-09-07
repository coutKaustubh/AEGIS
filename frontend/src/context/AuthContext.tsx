import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '@/types/system';
import { getCurrentUser, login as authLogin, logout as authLogout, isAdmin as checkIsAdmin } from '@/services/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password?: string) => Promise<User>;
  logout: () => Promise<void>;
  switchDemoUser: (email: string) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session hydration
    try {
      const stored = getCurrentUser();
      if (stored) {
        setUser(stored);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password?: string): Promise<User> => {
    setLoading(true);
    try {
      const loggedUser = await authLogin(email, password);
      setUser(loggedUser);
      return loggedUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authLogout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const switchDemoUser = async (email: string): Promise<User> => {
    return login(email, '••••••••••••');
  };

  const isAuthenticated = !!user;
  const isAdmin = checkIsAdmin(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isAdmin,
        login,
        logout,
        switchDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
