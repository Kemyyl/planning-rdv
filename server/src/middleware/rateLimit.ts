import rateLimit from 'express-rate-limit';

/**
 * Rate limiting pour les endpoints sensibles (login, register, reset).
 * Limites : 5 tentatives par IP / 15 min.
 * Retourne 429 Too Many Requests avec un message JSON standardisé.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

/**
 * Rate limiting plus permissif pour les endpoints publics généraux
 * (prestations, formations, créneaux…).
 * Limite : 100 req par IP / minute.
 */
export const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Veuillez ralentir.' },
});

/**
 * Rate limiting pour les endpoints de création/soumission publique
 * (contact, demande devis, création RDV public).
 * Limite : 10 soumissions par IP / 10 min.
 */
export const submitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de soumissions. Réessayez dans quelques minutes.' },
});
