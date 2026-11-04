import { randomBytes } from 'crypto';

/**
 * Store en mémoire pour les `state` OAuth. Le state protège contre CSRF :
 * un attaquant ne peut pas forger un callback valide pour une victime
 * puisqu'il ne connaît pas le state généré côté serveur.
 *
 * TTL : 10 minutes (la fenêtre est courte pour terminer le flow OAuth).
 */
interface Entry { adminId: number; exp: number }

const store = new Map<string, Entry>();
const TTL_MS = 10 * 60 * 1000;

function sweep() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.exp < now) store.delete(k);
  }
}

export function createOAuthState(adminId: number): string {
  sweep();
  const state = randomBytes(32).toString('base64url');
  store.set(state, { adminId, exp: Date.now() + TTL_MS });
  return state;
}

/**
 * Consomme un state (one-shot). Retourne l'adminId si valide, null sinon.
 */
export function consumeOAuthState(state: string | undefined): number | null {
  if (!state) return null;
  sweep();
  const entry = store.get(state);
  if (!entry) return null;
  store.delete(state); // one-shot
  if (entry.exp < Date.now()) return null;
  return entry.adminId;
}
