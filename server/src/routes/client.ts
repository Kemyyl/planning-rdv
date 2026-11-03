import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { z } from 'zod';
import { supabase } from '../lib/supabase';

export const clientRouter = Router();

interface ClientReq extends Request { clientId: number }

function requireClientAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: 'Non autorisé' }); return; }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as { id: number; role: string };
    if (payload.role !== 'client') { res.status(403).json({ error: 'Accès refusé' }); return; }
    (req as ClientReq).clientId = payload.id;
    next();
  } catch { res.status(401).json({ error: 'Jeton invalide' }); }
}

// POST /api/client/register
clientRouter.post('/register', async (req, res) => {
  const parsed = z.object({
    email: z.string().email(),
    mot_de_passe: z.string().min(8, 'Minimum 8 caractères'),
    nom: z.string().min(1),
    prenom: z.string().min(1),
    telephone: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return; }
  const { email, mot_de_passe, nom, prenom, telephone } = parsed.data;

  const hash = await bcrypt.hash(mot_de_passe, 12);
  const { data: existing } = await supabase.from('clients').select('id,compte_actif').eq('email', email).single();

  let clientId: number;
  if (existing) {
    if ((existing as { compte_actif: boolean }).compte_actif) {
      res.status(409).json({ error: 'Un compte existe déjà avec cet e-mail.' }); return;
    }
    await supabase.from('clients').update({ mot_de_passe: hash, compte_actif: true, nom, prenom, telephone }).eq('id', (existing as { id: number }).id);
    clientId = (existing as { id: number }).id;
  } else {
    const { data, error } = await supabase.from('clients')
      .insert({ email, mot_de_passe: hash, nom, prenom, telephone, compte_actif: true })
      .select('id').single();
    if (error || !data) { res.status(500).json({ error: error?.message || 'Erreur' }); return; }
    clientId = (data as { id: number }).id;
  }

  const token = jwt.sign({ id: clientId, email, role: 'client' }, process.env.JWT_SECRET!, { expiresIn: '30d' });
  res.status(201).json({ token, id: clientId, prenom });
});

// POST /api/client/login
clientRouter.post('/login', async (req, res) => {
  const parsed = z.object({ email: z.string().email(), mot_de_passe: z.string() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Données invalides' }); return; }
  const { email, mot_de_passe } = parsed.data;

  const { data: client } = await supabase
    .from('clients').select('id,email,mot_de_passe,nom,prenom,compte_actif').eq('email', email).single();

  if (!client || !(client as { compte_actif: boolean }).compte_actif || !(client as { mot_de_passe: string }).mot_de_passe) {
    res.status(401).json({ error: 'Identifiants incorrects ou compte inexistant.' }); return;
  }
  const ok = await bcrypt.compare(mot_de_passe, (client as { mot_de_passe: string }).mot_de_passe);
  if (!ok) { res.status(401).json({ error: 'Identifiants incorrects.' }); return; }

  const token = jwt.sign({ id: (client as { id: number }).id, email, role: 'client' }, process.env.JWT_SECRET!, { expiresIn: '30d' });
  res.json({ token, id: (client as { id: number }).id, prenom: (client as { prenom: string }).prenom });
});

// GET /api/client/me
clientRouter.get('/me', requireClientAuth, async (req, res) => {
  const { data } = await supabase.from('clients').select('id,nom,prenom,email,telephone,created_at').eq('id', (req as ClientReq).clientId).single();
  res.json(data);
});

// PATCH /api/client/profil
clientRouter.patch('/profil', requireClientAuth, async (req, res) => {
  const parsed = z.object({
    prenom: z.string().min(1).optional(),
    nom: z.string().min(1).optional(),
    telephone: z.string().optional().nullable(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return; }
  const { data, error } = await supabase.from('clients').update(parsed.data).eq('id', (req as ClientReq).clientId).select('id,nom,prenom,email,telephone').single();
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// PATCH /api/client/profil/mot-de-passe
clientRouter.patch('/profil/mot-de-passe', requireClientAuth, async (req, res) => {
  const parsed = z.object({ ancien: z.string(), nouveau: z.string().min(8, 'Minimum 8 caractères') }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0].message }); return; }
  const { data: client } = await supabase.from('clients').select('mot_de_passe').eq('id', (req as ClientReq).clientId).single();
  if (!client || !(client as { mot_de_passe: string }).mot_de_passe) { res.status(400).json({ error: 'Compte sans mot de passe' }); return; }
  const ok = await bcrypt.compare(parsed.data.ancien, (client as { mot_de_passe: string }).mot_de_passe);
  if (!ok) { res.status(400).json({ error: 'Ancien mot de passe incorrect' }); return; }
  const hash = await bcrypt.hash(parsed.data.nouveau, 12);
  await supabase.from('clients').update({ mot_de_passe: hash }).eq('id', (req as ClientReq).clientId);
  res.json({ ok: true });
});

// GET /api/client/rdv
clientRouter.get('/rdv', requireClientAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('rendez_vous')
    .select('*,prestation:prestations(nom,couleur,duree,prix),notes_seance(id,contenu,created_at)')
    .eq('client_id', (req as ClientReq).clientId)
    .order('debut', { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// GET /api/client/rdv/:id/pdf
clientRouter.get('/rdv/:id/pdf', requireClientAuth, async (req, res) => {
  const { data: rdv, error } = await supabase
    .from('rendez_vous')
    .select('*,prestation:prestations(nom,duree,prix),client:clients(prenom,nom,email)')
    .eq('id', req.params.id)
    .eq('client_id', (req as ClientReq).clientId)
    .single();

  if (error || !rdv) { res.status(404).json({ error: 'Séance introuvable' }); return; }

  const prestation = rdv.prestation as { nom: string; duree: number; prix?: number } | null;
  const client = rdv.client as { prenom: string; nom: string; email: string } | null;
  const debut = new Date(rdv.debut);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="seance-${format(debut, 'yyyy-MM-dd')}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fontSize(22).fillColor('#0A1D35').text('Synégo', 50, 50);
  doc.fontSize(10).fillColor('#56627A').text('Accompagnement thérapeutique', 50, 78);
  doc.moveTo(50, 100).lineTo(545, 100).strokeColor('#E7DCCD').stroke();

  // Title
  doc.fontSize(16).fillColor('#0A1D35').text('Résumé de séance', 50, 120);

  // Details
  const y = 160;
  const rows: [string, string][] = [
    ['Date', format(debut, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })],
    ['Prestation', prestation?.nom || '—'],
    ['Durée', prestation?.duree ? `${prestation.duree} min` : '—'],
    ['Client', client ? `${client.prenom} ${client.nom}` : '—'],
    ['Statut', rdv.statut === 'confirme' ? 'Effectuée' : rdv.statut],
  ];

  rows.forEach(([label, value], i) => {
    const rowY = y + i * 30;
    doc.fontSize(10).fillColor('#56627A').text(label, 50, rowY);
    doc.fontSize(10).fillColor('#0A1D35').text(value, 200, rowY);
    if (i < rows.length - 1) {
      doc.moveTo(50, rowY + 20).lineTo(545, rowY + 20).strokeColor('#F7F2EB').stroke();
    }
  });

  // Footer
  doc.fontSize(9).fillColor('#9BA8B8')
    .text(`Document généré le ${format(new Date(), 'd MMM yyyy', { locale: fr })} — Synégo`, 50, 750, { align: 'center' });

  doc.end();
});
