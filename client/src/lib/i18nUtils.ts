import type { Prestation } from '@synego/shared';

export function localizePrestation(p: Prestation, lang: string): Prestation {
  const isEn = lang.startsWith('en');
  return {
    ...p,
    nom: (isEn && p.nom_en) ? p.nom_en : p.nom,
    description: (isEn && p.description_en) ? p.description_en : p.description,
  };
}
