/**
 * Utilitaires de sécurité pour les requêtes Supabase / PostgREST.
 *
 * - escapeIlike : neutralise les wildcards SQL (%, _) et le backslash dans la valeur
 *   d'un pattern ilike. Indispensable quand la valeur vient d'un input utilisateur.
 * - mergeByEmailOrId : lance deux requêtes parallèles (par client_id puis par email)
 *   et fusionne/déduplique les résultats, évitant la concaténation PostgREST
 *   via `.or()` qui est vulnérable aux injections de filtres.
 */

export function escapeIlike(s: string): string {
  return s.replace(/[\\%_]/g, '\\$&');
}

interface Row { id: string | number }

export function mergeDedupe<T extends Row>(a: T[] | null | undefined, b: T[] | null | undefined): T[] {
  const seen = new Set<string | number>();
  const out: T[] = [];
  for (const r of a ?? []) { if (!seen.has(r.id)) { seen.add(r.id); out.push(r); } }
  for (const r of b ?? []) { if (!seen.has(r.id)) { seen.add(r.id); out.push(r); } }
  return out;
}
