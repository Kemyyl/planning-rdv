import { createContext, useContext, useState } from 'react';

interface ClientAuthCtx {
  token: string | null;
  clientId: string | null;
  prenom: string | null;
  nom: string | null;
  login: (token: string, id: string, prenom: string, nom?: string) => void;
  logout: () => void;
}

const ClientAuthContext = createContext<ClientAuthCtx>({
  token: null, clientId: null, prenom: null, nom: null,
  login: () => {}, logout: () => {},
});

export function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('client_token'));
  const [clientId, setClientId] = useState<string | null>(() => localStorage.getItem('client_id'));
  const [prenom, setPrenom] = useState<string | null>(() => localStorage.getItem('client_prenom'));
  const [nom, setNom] = useState<string | null>(() => localStorage.getItem('client_nom'));

  function login(t: string, id: string, p: string, n?: string) {
    localStorage.setItem('client_token', t);
    localStorage.setItem('client_id', id);
    localStorage.setItem('client_prenom', p);
    if (n) localStorage.setItem('client_nom', n);
    setToken(t); setClientId(id); setPrenom(p); if (n) setNom(n);
  }
  function logout() {
    ['client_token', 'client_id', 'client_prenom', 'client_nom'].forEach(k => localStorage.removeItem(k));
    setToken(null); setClientId(null); setPrenom(null); setNom(null);
  }

  return (
    <ClientAuthContext.Provider value={{ token, clientId, prenom, nom, login, logout }}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export const useClientAuth = () => useContext(ClientAuthContext);
