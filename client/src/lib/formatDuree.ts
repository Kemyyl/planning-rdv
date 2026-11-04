/**
 * Formate une durée en minutes vers un affichage lisible.
 * - < 60 min → "45 min"
 * - heures pleines → "1 h", "8 h"
 * - heures + minutes → "1 h 30"
 */
export function formatDuree(minutes: number | null | undefined, lang: 'fr' | 'en' = 'fr'): string {
  if (minutes == null || isNaN(minutes)) return '';

  const minLabel = lang === 'fr' ? 'min' : 'min';
  const hLabel = 'h';

  if (minutes < 60) return `${minutes} ${minLabel}`;

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (m === 0) return `${h} ${hLabel}`;
  return `${h} ${hLabel} ${m}`;
}
