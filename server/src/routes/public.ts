import { Router } from 'express';
import { addMinutes, parseISO } from 'date-fns';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { supabase } from '../lib/supabase';
import { getCreneauxDisponibles } from '../services/creneaux';
import { sendConfirmationEmail, sendInviteEmail, sendDevisEmail, sendDevisConfirmEmail } from '../lib/email';
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
    .from('prestations').select('*').eq('actif', true).eq('visible_client', true).order('ordre');
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
  prestation_id: z.coerce.number().int().positive(),
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
  let clientId: number;
  const { data: existingClient } = await supabase.from('clients').select('id').eq('email', client.email).single();
  if (existingClient) {
    clientId = (existingClient as { id: number }).id;
  } else {
    const inviteToken = randomUUID();
    const inviteExpiry = new Date(); inviteExpiry.setDate(inviteExpiry.getDate() + 7);
    const { data: newClient, error: clientErr } = await supabase
      .from('clients').insert({
        nom: client.nom, prenom: client.prenom, email: client.email, telephone: client.telephone,
        compte_actif: true, token_reinitialisation: inviteToken, token_expire_le: inviteExpiry.toISOString(),
      })
      .select('id').single();
    if (clientErr || !newClient) { res.status(500).json({ error: 'Erreur lors de la création du client' }); return; }
    clientId = (newClient as { id: number }).id;
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    sendInviteEmail(client.email, client.prenom, `${appUrl}/definir-mot-de-passe?token=${inviteToken}`)
      .catch(e => console.error('Invite email failed:', e));
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
      { debut, fin, prestation: prestation as { nom: string; duree: number }, duree: (prestation as { duree: number }).duree, lien_meet, jeton_annulation: (rdv as { jeton_annulation: string }).jeton_annulation }
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

// POST /api/public/definir-mot-de-passe
publicRouter.post('/definir-mot-de-passe', async (req, res) => {
  const parsed = z.object({
    token: z.string().uuid(),
    mot_de_passe: z.string().min(8, 'Minimum 8 caractères'),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return; }
  const { token, mot_de_passe } = parsed.data;

  const { data: client } = await supabase
    .from('clients')
    .select('id,email,prenom,nom,token_expire_le')
    .eq('token_reinitialisation', token)
    .single();

  if (!client) { res.status(400).json({ error: 'Lien invalide ou expiré.' }); return; }
  const c = client as { id: number; email: string; prenom: string; nom: string; token_expire_le: string };
  if (new Date(c.token_expire_le) < new Date()) { res.status(400).json({ error: 'Ce lien a expiré.' }); return; }

  const hash = await bcrypt.hash(mot_de_passe, 12);
  await supabase.from('clients').update({
    mot_de_passe: hash, token_reinitialisation: null, token_expire_le: null,
  }).eq('id', c.id);

  const jwtToken = (await import('jsonwebtoken')).default.sign(
    { id: c.id, email: c.email, role: 'client' }, process.env.JWT_SECRET!, { expiresIn: '30d' }
  );
  res.json({ token: jwtToken, id: c.id, prenom: c.prenom });
});

// PATCH /api/public/rdv/:id/annuler
publicRouter.patch('/rdv/:id/annuler', async (req, res) => {
  const { jeton } = req.body;
  if (!jeton) { res.status(400).json({ error: 'Jeton manquant' }); return; }

  const { data: rdv } = await supabase
    .from('rendez_vous').select('id,debut,statut').eq('id', req.params.id).eq('jeton_annulation', jeton).single();
  if (!rdv || (rdv as { statut: string }).statut !== 'confirme') {
    res.status(400).json({ error: 'Impossible d\'annuler ce rendez-vous' }); return;
  }
  const heuresRestantes = (new Date((rdv as { debut: string }).debut).getTime() - Date.now()) / 3_600_000;
  if (heuresRestantes < 24) {
    res.status(400).json({ error: 'Annulation impossible : le délai de 24h avant la séance est dépassé.' }); return;
  }

  await supabase.from('rendez_vous').update({ statut: 'annule' }).eq('id', req.params.id);
  res.json({ ok: true });
});

// POST /api/public/devis
publicRouter.post('/devis', async (req, res) => {
  const parsed = z.object({
    prenom: z.string().min(1),
    nom: z.string().min(1),
    email: z.string().email(),
    telephone: z.string().optional(),
    type_accompagnement: z.string().optional(),
    message: z.string().min(10, 'Minimum 10 caractères'),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return; }

  sendDevisEmail(parsed.data).catch(e => console.error('Devis email failed:', e));
  sendDevisConfirmEmail(parsed.data.email, parsed.data.prenom).catch(e => console.error('Devis confirm email failed:', e));
  res.json({ ok: true });
});
