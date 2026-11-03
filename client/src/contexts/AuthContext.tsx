import { createContext, useContext, useState } from 'react';

interface AuthCtx {
  token: string | null;
  nom: string | null;
  login: (token: string, nom: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({ token: null, nom: null, login: () => {}, logout: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
  const [nom, setNom] = useState<string | null>(() => localStorage.getItem('admin_nom'));

  const login = (t: string, n: string) => {
    localStorage.setItem('admin_token', t);
    localStorage.setItem('admin_nom', n);
    setToken(t); setNom(n);
  };
  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_nom');
    setToken(null); setNom(null);
  };

  return <AuthContext.Provider value={{ token, nom, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
