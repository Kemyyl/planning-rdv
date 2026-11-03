import type { Prestation } from '@synego/shared';

export function localizePrestation(p: Prestation, lang: string): Prestation {
  return {
    ...p,
    nom: (lang === 'en' && p.nom_en) ? p.nom_en : p.nom,
    description: (lang === 'en' && p.description_en) ? p.description_en : p.description,
  };
}
