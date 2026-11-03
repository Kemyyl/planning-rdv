import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { getGoogleOAuthUrl, exchangeGoogleCode } from '../lib/google-meet';

export const adminRouter = Router();

// POST /api/admin/login
adminRouter.post('/login', async (req, res) => {
  const parsed = z.object({ email: z.string().email(), mot_de_passe: z.string() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Données invalides' }); return; }
  const { email, mot_de_passe } = parsed.data;

  const { data: admin } = await supabase.from('admins').select('id,email,mot_de_passe,nom').eq('email', email).single();
  if (!admin) { res.status(401).json({ error: 'Identifiants incorrects' }); return; }

  const ok = await bcrypt.compare(mot_de_passe, (admin as { mot_de_passe: string }).mot_de_passe);
  if (!ok) { res.status(401).json({ error: 'Identifiants incorrects' }); return; }

  const token = jwt.sign({ id: (admin as { id: string }).id, email }, process.env.JWT_SECRET!, { expiresIn: '8h' });
  res.json({ token, nom: (admin as { nom: string }).nom });
});

// GET /api/admin/google-callback — appelé par Google après consentement (pas d'auth requise)
adminRouter.get('/google-callback', async (req, res) => {
  const { code, state } = req.query as { code?: string; state?: string };
  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  if (!code || !state) {
    res.redirect(`${appUrl}/admin/agenda?google=error`);
    return;
  }

  const result = await exchangeGoogleCode(code);
  if (!result) {
    res.redirect(`${appUrl}/admin/agenda?google=error`);
    return;
  }

  await supabase.from('admins').update({
    google_refresh_token: result.refreshToken,
    google_calendar_id: result.calendarId,
  }).eq('id', state);

  res.redirect(`${appUrl}/admin/agenda?google=connected`);
});

// Toutes les routes suivantes nécessitent auth
adminRouter.use(requireAuth);

// GET /api/admin/me
adminRouter.get('/me', async (req, res) => {
  const { id } = (req as typeof req & { admin: { id: string } }).admin;
  const { data, error } = await supabase
    .from('admins').select('id,email,nom,google_calendar_id,google_refresh_token').eq('id', id).single();
  if (error || !data) { res.status(404).json({ error: 'Admin introuvable' }); return; }
  const d = data as Record<string, unknown>;
  res.json({
    ...d,
    google_connected: !!d.google_refresh_token,
    google_refresh_token: undefined,
  });
});

// PATCH /api/admin/me
adminRouter.patch('/me', async (req, res) => {
  const { id } = (req as typeof req & { admin: { id: string } }).admin;
  const allowed = ['nom', 'google_calendar_id'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
  if (Object.keys(update).length === 0) { res.status(400).json({ error: 'Rien à mettre à jour' }); return; }
  const { data, error } = await supabase.from('admins').update(update).eq('id', id).select('id,email,nom,google_calendar_id').single();
  if (error || !data) { res.status(500).json({ error: 'Erreur de mise à jour' }); return; }
  res.json(data);
});

// DELETE /api/admin/me/google — déconnecter Google
adminRouter.delete('/me/google', async (req, res) => {
  const { id } = (req as typeof req & { admin: { id: string } }).admin;
  await supabase.from('admins').update({ google_refresh_token: null, google_calendar_id: null }).eq('id', id);
  res.json({ ok: true });
});

// GET /api/admin/google-auth — génère l'URL d'autorisation Google
adminRouter.get('/google-auth', (req, res) => {
  const { id } = (req as typeof req & { admin: { id: string } }).admin;
  const url = getGoogleOAuthUrl(id);
  if (!url) { res.status(500).json({ error: 'OAuth non configuré (GOOGLE_CLIENT_ID manquant)' }); return; }
  res.json({ url });
});

// GET /api/admin/dashboard
adminRouter.get('/dashboard', async (_req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today); nextWeek.setDate(nextWeek.getDate() + 7);

  const [rdvsToday, rdvsWeek, rdvsTotal, clientsTotal, prochains, pending] = await Promise.all([
    supabase.from('rendez_vous').select('id', { count: 'exact', head: true }).eq('statut', 'confirme').gte('debut', today.toISOString()).lt('debut', tomorrow.toISOString()),
    supabase.from('rendez_vous').select('id', { count: 'exact', head: true }).eq('statut', 'confirme').gte('debut', today.toISOString()).lt('debut', nextWeek.toISOString()),
    supabase.from('rendez_vous').select('id', { count: 'exact', head: true }).eq('statut', 'confirme'),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('compte_actif', true),
    supabase.from('rendez_vous').select('*,client:clients(prenom,nom,email),prestation:prestations(nom,couleur,duree)').in('statut', ['confirme', 'en_attente']).gte('debut', today.toISOString()).order('debut').limit(50),
    supabase.from('rendez_vous').select('id', { count: 'exact', head: true }).eq('statut', 'en_attente'),
  ]);

  res.json({
    stats: { today: rdvsToday.count || 0, week: rdvsWeek.count || 0, total: rdvsTotal.count || 0, clients: clientsTotal.count || 0 },
    prochains: prochains.data || [],
    pendingCount: pending.count || 0,
  });
});

// GET /api/admin/rdv
adminRouter.get('/rdv', async (req, res) => {
  const { debut, fin } = req.query as Record<string, string>;
  let q = supabase.from('rendez_vous').select('*,client:clients(prenom,nom,email),prestation:prestations(nom,couleur,duree)').neq('statut', 'annule').order('debut');
  if (debut) q = q.gte('debut', debut);
  if (fin) q = q.lte('debut', fin);
  const { data, error } = await q;
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// POST /api/admin/rdv (ajout manuel)
adminRouter.post('/rdv', async (req, res) => {
  const { client_id, prestation_id, debut, note_interne } = req.body;
  if (!client_id || !prestation_id || !debut) { res.status(400).json({ error: 'Données manquantes' }); return; }
  const { data: p } = await supabase.from('prestations').select('duree').eq('id', prestation_id).single();
  if (!p) { res.status(404).json({ error: 'Prestation introuvable' }); return; }
  const fin = new Date(debut);
  fin.setMinutes(fin.getMinutes() + (p as { duree: number }).duree);
  const insert: Record<string, unknown> = { client_id, prestation_id, debut, fin: fin.toISOString(), statut: 'confirme' };
  if (note_interne?.trim()) insert.commentaire = note_interne.trim();
  const { data, error } = await supabase.from('rendez_vous')
    .insert(insert)
    .select('id,debut,fin,statut,commentaire,client:clients(prenom,nom,email),prestation:prestations(nom,couleur,duree)')
    .single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// GET /api/admin/clients
adminRouter.get('/clients', async (req, res) => {
  const withStats = req.query.stats === '1';
  if (withStats) {
    const { data, error } = await supabase
      .from('clients')
      .select('*, rdvs:rendez_vous(count), notes:notes_seance(count)')
      .order('created_at', { ascending: false });
    if (error) { res.status(500).json({ error: error.message }); return; }
    const mapped = (data || []).map((c: Record<string, unknown>) => ({
      ...c,
      seances_count: Array.isArray(c.rdvs) ? (c.rdvs as Array<{ count: number }>)[0]?.count ?? 0 : 0,
      has_notes: Array.isArray(c.notes) ? ((c.notes as Array<{ count: number }>)[0]?.count ?? 0) > 0 : false,
      rdvs: undefined,
      notes: undefined,
    }));
    res.json(mapped);
    return;
  }
  const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// GET /api/admin/horaires
adminRouter.get('/horaires', async (_req, res) => {
  const { data, error } = await supabase.from('horaires').select('*').order('jour');
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// PUT /api/admin/horaires
adminRouter.put('/horaires', async (req, res) => {
  const horaires = req.body as Array<{ id: string; jour: number; ouverture?: string; fermeture?: string; ouverture_aprem?: string; fermeture_aprem?: string; actif: boolean }>;
  if (!Array.isArray(horaires)) { res.status(400).json({ error: 'Format invalide' }); return; }
  const updates = await Promise.all(horaires.map(h =>
    supabase.from('horaires').update({
      ouverture: h.ouverture || null,
      fermeture: h.fermeture || null,
      ouverture_aprem: h.ouverture_aprem || null,
      fermeture_aprem: h.fermeture_aprem || null,
      actif: h.actif,
    }).eq('id', h.id)
  ));
  const err = updates.find(u => u.error);
  if (err?.error) { res.status(500).json({ error: err.error.message }); return; }
  res.json({ ok: true });
});

// GET /api/admin/prestations
adminRouter.get('/prestations', async (_req, res) => {
  const { data, error } = await supabase.from('prestations').select('*').order('ordre');
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// ── Notes de séance ─────────────────────────────────────────

// GET /api/admin/clients/:id/notes
adminRouter.get('/clients/:id/notes', async (req, res) => {
  const { data, error } = await supabase
    .from('notes_seance')
    .select('*,rdv:rendez_vous(debut,fin,prestation:prestations(nom))')
    .eq('client_id', req.params.id)
    .order('created_at', { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// POST /api/admin/rdv/:id/note
adminRouter.post('/rdv/:id/note', async (req, res) => {
  const { contenu } = req.body;
  if (!contenu?.trim()) { res.status(400).json({ error: 'Le contenu est requis' }); return; }
  const { data: rdv } = await supabase.from('rendez_vous').select('client_id').eq('id', req.params.id).single();
  if (!rdv) { res.status(404).json({ error: 'RDV introuvable' }); return; }
  const adminPayload = (req as typeof req & { admin: { id: string } }).admin;
  const { data, error } = await supabase.from('notes_seance')
    .insert({ rdv_id: req.params.id, client_id: (rdv as { client_id: string }).client_id, admin_id: adminPayload?.id, contenu: contenu.trim() })
    .select('*').single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// PATCH /api/admin/notes/:id
adminRouter.patch('/notes/:id', async (req, res) => {
  const { contenu } = req.body;
  if (!contenu?.trim()) { res.status(400).json({ error: 'Contenu requis' }); return; }
  const { data, error } = await supabase.from('notes_seance')
    .update({ contenu: contenu.trim(), updated_at: new Date().toISOString() })
    .eq('id', req.params.id).select().single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// DELETE /api/admin/notes/:id
adminRouter.delete('/notes/:id', async (req, res) => {
  const { error } = await supabase.from('notes_seance').delete().eq('id', req.params.id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

// PATCH /api/admin/clients/:id
adminRouter.patch('/clients/:id', async (req, res) => {
  const allowed = ['seances_objectif', 'telephone', 'nom', 'prenom', 'compte_actif'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
  if (Object.keys(update).length === 0) { res.status(400).json({ error: 'Rien à mettre à jour' }); return; }
  const { data, error } = await supabase.from('clients').update(update).eq('id', req.params.id).select().single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// PATCH /api/admin/prestations/:id
adminRouter.patch('/prestations/:id', async (req, res) => {
  const allowed = ['nom', 'nom_en', 'description', 'description_en', 'duree', 'prix', 'couleur', 'actif', 'ordre'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
  const { data, error } = await supabase.from('prestations').update(update).eq('id', req.params.id).select().single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});
