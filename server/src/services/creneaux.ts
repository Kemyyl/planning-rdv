import { addMinutes, isWithinInterval, parseISO, startOfDay, endOfDay, eachDayOfInterval, setHours, setMinutes } from 'date-fns';
import { supabase } from '../lib/supabase';
import type { Creneau } from '@synego/shared';

export async function getCreneauxDisponibles(
  prestation_id: string,
  debut: Date,
  fin: Date
): Promise<Creneau[]> {
  const [{ data: prestation }, { data: horaires }, { data: rdvs }] = await Promise.all([
    supabase.from('prestations').select('duree').eq('id', prestation_id).single(),
    supabase.from('horaires').select('*').eq('actif', true),
    supabase.from('rendez_vous').select('debut,fin').eq('statut', 'confirme').gte('debut', debut.toISOString()).lte('fin', fin.toISOString()),
  ]);

  if (!prestation || !horaires) return [];
  const duree = prestation.duree as number;
  const reservations = (rdvs || []) as { debut: string; fin: string }[];

  const creneaux: Creneau[] = [];
  const jours = eachDayOfInterval({ start: debut, end: fin });

  for (const jour of jours) {
    const jourSemaine = jour.getDay() === 0 ? 6 : jour.getDay() - 1;
    const horaire = horaires.find(h => h.jour === jourSemaine);
    if (!horaire?.actif) continue;

    const plages: { ouverture: string; fermeture: string }[] = [];
    if (horaire.ouverture && horaire.fermeture)
      plages.push({ ouverture: horaire.ouverture as string, fermeture: horaire.fermeture as string });
    if (horaire.ouverture_aprem && horaire.fermeture_aprem)
      plages.push({ ouverture: horaire.ouverture_aprem as string, fermeture: horaire.fermeture_aprem as string });

    for (const plage of plages) {
      const [oH, oM] = plage.ouverture.split(':').map(Number);
      const [fH, fM] = plage.fermeture.split(':').map(Number);
      let current = setMinutes(setHours(jour, oH), oM);
      const fermeture = setMinutes(setHours(jour, fH), fM);

      while (addMinutes(current, duree) <= fermeture) {
        const slotFin = addMinutes(current, duree);
        const chevauchement = reservations.some(r =>
          isWithinInterval(current, { start: parseISO(r.debut), end: parseISO(r.fin) }) ||
          isWithinInterval(slotFin, { start: parseISO(r.debut), end: parseISO(r.fin) }) ||
          (current <= parseISO(r.debut) && slotFin >= parseISO(r.fin))
        );
        creneaux.push({ debut: current.toISOString(), fin: slotFin.toISOString(), disponible: !chevauchement });
        current = addMinutes(current, 30);
      }
    }
  }
  return creneaux;
}
