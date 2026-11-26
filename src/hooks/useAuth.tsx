import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { siteApi, type Account } from '@/lib/siteApi';

interface AuthContextType {
  user: Account | null;
  isAdmin: boolean;
  isRedakteur: boolean;
  hasBackendAccess: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAdmin = user?.role === 'admin';
  const isRedakteur = user?.role === 'redakteur';
  useEffect(() => {
    let active = true;
    siteApi.me().then(({ data }) => { if (active) { setUser(data); setIsLoading(false); } });
    return () => { active = false; };
  }, []);
  const signIn = async (email: string, password: string) => {
    const result = await siteApi.login(email, password);
    setUser(result.data);
    return { error: result.error };
  };
  const signOut = async () => {
    const result = await siteApi.logout();
    if (result.error) throw result.error;
    setUser(null);
  };
  return <AuthContext.Provider value={{ user, isAdmin, isRedakteur, hasBackendAccess: isAdmin || isRedakteur, isLoading, signIn, signOut }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider fehlt');
  return context;
}
