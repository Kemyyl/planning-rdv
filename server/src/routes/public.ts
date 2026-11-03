import { Router } from 'express';
import { addMinutes, parseISO } from 'date-fns';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { getCreneauxDisponibles } from '../services/creneaux';
import { sendConfirmationEmail } from '../lib/email';
import { createMeetEvent } from '../lib/google-meet';

function fallbackMeetLink(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const seg = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `https://meet.jit.si/synego-${seg(4)}-${seg(4)}-${seg(4)}`;
}

export const publicRouter = Router();

// GET /api/public/prestations
publicRouter.get('/prestations', async (_req, res) => {
  const { data, error } = await supabase
    .from('prestations').select('*').eq('actif', true).order('ordre');
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// GET /api/public/creneaux?prestation_id=X&debut=ISO&fin=ISO
publicRouter.get('/creneaux', async (req, res) => {
  const { prestation_id, debut, fin } = req.query as Record<string, string>;
  if (!prestation_id || !debut || !fin) { res.status(400).json({ error: 'Paramètres manquants' }); return; }
  try {
    const creneaux = await getCreneauxDisponibles(prestation_id, new Date(debut), new Date(fin));
    res.json(creneaux);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/public/rdv
const creerRdvSchema = z.object({
  prestation_id: z.string().uuid(),
  debut: z.string().datetime(),
  commentaire: z.string().min(1, 'Le motif de consultation est requis'),
  client: z.object({
    nom: z.string().min(1),
    prenom: z.string().min(1),
    email: z.string().email(),
    telephone: z.string().optional(),
    consentement: z.boolean().refine(v => v, 'Consentement requis'),
  }),
});

publicRouter.post('/rdv', async (req, res) => {
  const parsed = creerRdvSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return; }
  const { prestation_id, debut, commentaire, client } = parsed.data;

  // Vérifier que la prestation existe
  const { data: prestation } = await supabase.from('prestations').select('nom,duree').eq('id', prestation_id).single();
  if (!prestation) { res.status(404).json({ error: 'Prestation introuvable' }); return; }

  const fin = addMinutes(parseISO(debut), (prestation as { nom: string; duree: number }).duree).toISOString();

  // Vérifier absence de chevauchement
  const { data: conflit } = await supabase
    .from('rendez_vous').select('id').eq('statut', 'confirme')
    .lt('debut', fin).gt('fin', debut).limit(1);
  if (conflit && conflit.length > 0) { res.status(409).json({ error: 'Ce créneau vient d\'être pris. Choisissez un autre horaire.' }); return; }

  // Upsert client
  let clientId: string;
  const { data: existingClient } = await supabase.from('clients').select('id').eq('email', client.email).single();
  if (existingClient) {
    clientId = existingClient.id;
  } else {
    const { data: newClient, error: clientErr } = await supabase
      .from('clients').insert({ nom: client.nom, prenom: client.prenom, email: client.email, telephone: client.telephone })
      .select('id').single();
    if (clientErr || !newClient) { res.status(500).json({ error: 'Erreur lors de la création du client' }); return; }
    clientId = newClient.id;
  }

  // Récupérer les credentials Google du praticien (premier admin)
  const { data: adminData } = await supabase
    .from('admins').select('google_calendar_id,google_refresh_token').order('created_at').limit(1).single();
  const ad = adminData as { google_calendar_id?: string; google_refresh_token?: string } | null;
  const calendarId = ad?.google_calendar_id || undefined;
  const refreshToken = ad?.google_refresh_token || undefined;

  // Créer le lien Google Meet (ou Jitsi en fallback)
  const googleMeet = await createMeetEvent({
    title: `Séance ${(prestation as { nom: string }).nom} — ${client.prenom} ${client.nom}`,
    debut,
    fin,
    clientEmail: client.email,
    calendarId,
    refreshToken,
  });
  const lien_meet = googleMeet?.meetLink ?? fallbackMeetLink();
  const google_event_id = googleMeet?.googleEventId ?? null;

  const { data: rdv, error: rdvErr } = await supabase
    .from('rendez_vous').insert({ prestation_id, client_id: clientId, debut, fin, statut: 'confirme', lien_meet, commentaire, google_event_id })
    .select('id,jeton_annulation').single();
  if (rdvErr || !rdv) { res.status(500).json({ error: 'Erreur lors de la réservation' }); return; }

  // Envoyer email de confirmation (non bloquant)
  const { data: fullClient } = await supabase.from('clients').select('email,prenom').eq('id', clientId).single();
  if (fullClient) {
    sendConfirmationEmail(
      (fullClient as { email: string }).email,
      (fullClient as { prenom: string }).prenom,
      { debut, fin, prestation: prestation as { nom: string; duree: number }, lien_meet, jeton_annulation: (rdv as { jeton_annulation: string }).jeton_annulation }
    ).catch(e => console.error('Confirmation email failed:', e));
  }

  res.status(201).json({ id: rdv.id, jeton: rdv.jeton_annulation });
});

// GET /api/public/rdv/:id
publicRouter.get('/rdv/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('rendez_vous').select('*,client:clients(*),prestation:prestations(*)')
    .eq('id', req.params.id).single();
  if (error || !data) { res.status(404).json({ error: 'Introuvable' }); return; }
  res.json(data);
});

// GET /api/public/rdv/jeton/:jeton
publicRouter.get('/rdv/jeton/:jeton', async (req, res) => {
  const { data, error } = await supabase
    .from('rendez_vous').select('*,client:clients(*),prestation:prestations(*)')
    .eq('jeton_annulation', req.params.jeton).single();
  if (error || !data) { res.status(404).json({ error: 'Introuvable' }); return; }
  res.json(data);
});

// PATCH /api/public/rdv/:id/annuler
publicRouter.patch('/rdv/:id/annuler', async (req, res) => {
  const { jeton } = req.body;
  if (!jeton) { res.status(400).json({ error: 'Jeton manquant' }); return; }
  const { data, error } = await supabase
    .from('rendez_vous').update({ statut: 'annule' })
    .eq('id', req.params.id).eq('jeton_annulation', jeton).eq('statut', 'confirme')
    .select('id').single();
  if (error || !data) { res.status(400).json({ error: 'Impossible d\'annuler ce rendez-vous' }); return; }
  res.json({ ok: true });
});
