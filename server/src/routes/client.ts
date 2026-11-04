import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';
import { randomUUID } from 'crypto';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { generateDevisPdf } from '../lib/devis-pdf';

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

// GET /api/client/factures — factures émises pour ce client (paid ou avec facture_numero)
clientRouter.get('/factures', requireClientAuth, async (req, res) => {
  const clientId = (req as ClientReq).clientId;
  const { data: client } = await supabase.from('clients').select('email').eq('id', clientId).single();
  if (!client) { res.status(404).json({ error: 'Client introuvable' }); return; }

  const email = (client as { email: string }).email;

  const { data, error } = await supabase
    .from('devis')
    .select('id,numero,facture_numero,facture_date,prestation_nom,nb_seances,prix_par_seance,total,statut,paid_at,created_at')
    .or(`client_id.eq.${clientId},client_email.ilike.${email}`)
    .not('facture_numero', 'is', null)
    .order('facture_date', { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// GET /api/client/devis — devis & factures liés à ce client
clientRouter.get('/devis', requireClientAuth, async (req, res) => {
  const clientId = (req as ClientReq).clientId;
  const { data: client } = await supabase.from('clients').select('email').eq('id', clientId).single();
  if (!client) { res.status(404).json({ error: 'Client introuvable' }); return; }

  const email = (client as { email: string }).email;

  // Match by client_id OR by email (case-insensitive) to handle both linked and unlinked devis
  const { data, error } = await supabase
    .from('devis')
    .select('id,numero,prestation_nom,nb_seances,total,statut,email_envoye,validite_date,created_at,facture_numero,facture_date,prix_par_seance')
    .or(`client_id.eq.${clientId},client_email.ilike.${email}`)
    .order('created_at', { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data || []);
});

// PATCH /api/client/devis/:id/accepter
clientRouter.patch('/devis/:id/accepter', requireClientAuth, async (req, res) => {
  const clientId = (req as ClientReq).clientId;
  const { data: client } = await supabase.from('clients').select('email').eq('id', clientId).single();
  if (!client) { res.status(404).json({ error: 'Client introuvable' }); return; }

  const { data: devis } = await supabase.from('devis')
    .select('id,statut,facture_numero,client_email,client_id')
    .eq('id', req.params.id).single();
  if (!devis) { res.status(404).json({ error: 'Devis introuvable' }); return; }

  const d = devis as { id: string; statut: string; facture_numero?: string; client_email: string; client_id?: number };
  const email = (client as { email: string }).email;

  const owned = d.client_id === clientId || d.client_email.toLowerCase() === email.toLowerCase();
  if (!owned) { res.status(403).json({ error: 'Accès refusé' }); return; }
  if (d.statut !== 'envoye') {
    res.status(400).json({ error: 'Ce devis ne peut pas être accepté' }); return;
  }

  const update: Record<string, unknown> = { statut: 'accepte' };
  if (!d.facture_numero) {
    const factureNum = `FAC-${format(new Date(), 'yyyyMM')}-${randomUUID().slice(0, 6).toUpperCase()}`;
    update.facture_numero = factureNum;
    update.facture_date = format(new Date(), 'yyyy-MM-dd');
  }

  const { error } = await supabase.from('devis').update(update).eq('id', req.params.id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

// GET /api/client/devis/:id/facture
clientRouter.get('/devis/:id/facture', requireClientAuth, async (req, res) => {
  const clientId = (req as ClientReq).clientId;
  const { data: client } = await supabase.from('clients').select('email').eq('id', clientId).single();
  if (!client) { res.status(404).json({ error: 'Client introuvable' }); return; }

  const { data: devis } = await supabase.from('devis').select('*').eq('id', req.params.id).single();
  if (!devis) { res.status(404).json({ error: 'Devis introuvable' }); return; }

  const d = devis as {
    statut: string; facture_numero?: string; facture_date?: string; created_at: string;
    client_prenom: string; client_nom: string; client_email: string; client_id?: number;
    prestation_nom: string; duree: number; nb_seances: number;
    prix_par_seance: number; total: number; notes?: string; validite_date: string;
  };

  const email = (client as { email: string }).email;
  const owned = d.client_id === clientId || d.client_email.toLowerCase() === email.toLowerCase();
  if (!owned) { res.status(403).json({ error: 'Accès refusé' }); return; }
  if ((d.statut !== 'accepte' && d.statut !== 'paye') || !d.facture_numero) {
    res.status(400).json({ error: 'Facture non disponible' }); return;
  }

  const emissionDate = d.facture_date
    ? format(new Date(d.facture_date), 'd MMMM yyyy', { locale: fr })
    : format(new Date(d.created_at), 'd MMMM yyyy', { locale: fr });

  try {
    const pdfBuffer = await generateDevisPdf({
      devisNum: d.facture_numero,
      prenom: d.client_prenom, nom: d.client_nom, email: d.client_email,
      prestationNom: d.prestation_nom, duree: d.duree,
      nbSeances: d.nb_seances, prixParSeance: d.prix_par_seance,
      total: d.total, notes: d.notes, validiteDate: emissionDate, emissionDate,
      isFacture: true,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${d.facture_numero}.pdf"`);
    res.send(pdfBuffer);
  } catch {
    res.status(500).json({ error: 'Erreur génération facture' });
  }
});

// GET /api/client/devis/:id/devis-pdf — download the quote PDF (not the invoice)
clientRouter.get('/devis/:id/devis-pdf', requireClientAuth, async (req, res) => {
  const clientId = (req as ClientReq).clientId;
  const { data: client } = await supabase.from('clients').select('email').eq('id', clientId).single();
  if (!client) { res.status(404).json({ error: 'Client introuvable' }); return; }

  const { data: devis } = await supabase.from('devis').select('*').eq('id', req.params.id).single();
  if (!devis) { res.status(404).json({ error: 'Devis introuvable' }); return; }

  const d = devis as {
    statut: string; numero: string; created_at: string;
    client_prenom: string; client_nom: string; client_email: string; client_id?: number;
    prestation_nom: string; duree: number; nb_seances: number;
    prix_par_seance: number; total: number; notes?: string; validite_date: string;
  };

  const email = (client as { email: string }).email;
  const owned = d.client_id === clientId || d.client_email.toLowerCase() === email.toLowerCase();
  if (!owned) { res.status(403).json({ error: 'Accès refusé' }); return; }

  const emissionDate = format(new Date(d.created_at), 'd MMMM yyyy', { locale: fr });
  const validiteDate = d.validite_date
    ? format(new Date(d.validite_date), 'd MMMM yyyy', { locale: fr })
    : emissionDate;

  try {
    const pdfBuffer = await generateDevisPdf({
      devisNum: d.numero,
      prenom: d.client_prenom, nom: d.client_nom, email: d.client_email,
      prestationNom: d.prestation_nom, duree: d.duree,
      nbSeances: d.nb_seances, prixParSeance: Number(d.prix_par_seance),
      total: Number(d.total), notes: d.notes, validiteDate, emissionDate,
      isFacture: false,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${d.numero}.pdf"`);
    res.send(pdfBuffer);
  } catch {
    res.status(500).json({ error: 'Erreur génération devis' });
  }
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
