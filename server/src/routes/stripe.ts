import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { generateDevisPdf } from '../lib/devis-pdf';
import { sendFacturePdfEmail } from '../lib/email';

// ── Stripe client (lazy — initialized on first request so dotenv is already loaded) ──
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY non configuré');
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-10-28.endive' });
  }
  return _stripe;
}

// ── Auth middleware (same as client router) ────────────────────────────────
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

// ── Checkout router (uses parsed JSON body) ───────────────────────────────
export const stripeRouter = Router();

stripeRouter.post('/checkout', requireClientAuth, async (req, res) => {
  const clientId = (req as ClientReq).clientId;
  const { devis_id } = req.body;

  if (!devis_id) { res.status(400).json({ error: 'devis_id requis' }); return; }

  // Verify devis exists and is owned by this client
  const { data: client } = await supabase.from('clients').select('email,prenom,nom').eq('id', clientId).single();
  if (!client) { res.status(404).json({ error: 'Client introuvable' }); return; }

  const { data: devis } = await supabase
    .from('devis')
    .select('id,statut,total,prestation_nom,client_email,client_id,stripe_session_id,facture_numero')
    .eq('id', devis_id)
    .single();

  if (!devis) { res.status(404).json({ error: 'Devis introuvable' }); return; }

  const d = devis as {
    id: string; statut: string; total: number; prestation_nom: string;
    client_email: string; client_id?: number; stripe_session_id?: string;
    facture_numero?: string;
  };
  const c = client as { email: string; prenom: string; nom: string };

  const owned = d.client_id === clientId || d.client_email.toLowerCase() === c.email.toLowerCase();
  if (!owned) { res.status(403).json({ error: 'Accès refusé' }); return; }
  if (d.statut !== 'accepte') { res.status(400).json({ error: 'Ce devis n\'est pas en attente de paiement' }); return; }

  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(Number(d.total) * 100),
          product_data: {
            name: d.prestation_nom,
            description: `Accompagnement Synégo — ${d.prestation_nom}`,
          },
        },
        quantity: 1,
      }],
      customer_email: c.email,
      success_url: `${appUrl}/mes-devis?payment=success&devis_id=${d.id}`,
      cancel_url: `${appUrl}/mes-devis?payment=cancel&devis_id=${d.id}`,
      metadata: {
        devis_id: d.id,
        client_id: String(clientId),
        client_email: c.email,
      },
    });

    // Save session ID on the devis
    await supabase.from('devis').update({ stripe_session_id: session.id }).eq('id', d.id);

    res.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur Stripe';
    res.status(500).json({ error: msg });
  }
});

// ── Webhook router (needs raw body — mounted before express.json()) ────────
export const stripeWebhookRouter = Router();

stripeWebhookRouter.post(
  '/',
  // Raw body parser avec limite 1 Mo pour éviter les DoS mémoire
  (req: Request, res: Response, next: NextFunction) => {
    const MAX = 1_048_576;
    let data = '';
    let total = 0;
    let aborted = false;
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      if (aborted) return;
      total += chunk.length;
      if (total > MAX) {
        aborted = true;
        res.status(413).json({ error: 'Payload trop volumineux' });
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on('end', () => {
      if (aborted) return;
      (req as Request & { rawBody: string }).rawBody = data;
      next();
    });
  },
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) { res.status(500).json({ error: 'Webhook secret manquant' }); return; }

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(
        (req as Request & { rawBody: string }).rawBody,
        sig,
        webhookSecret,
      );
    } catch {
      res.status(400).json({ error: 'Signature invalide' }); return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // ── Formations ───────────────────────────────────────────────────────
      if (session.metadata?.type === 'formation' && session.metadata?.formation_id) {
        // Idempotence : ne pas réécrire si déjà payé, et exiger un vrai paiement Stripe
        if (session.payment_status !== 'paid') { res.json({ received: true }); return; }

        const { data: achat } = await supabase
          .from('formation_achats')
          .select('id,paid_at')
          .eq('stripe_session_id', session.id)
          .single();

        if (!achat) { res.json({ received: true }); return; }
        if ((achat as { paid_at: string | null }).paid_at) { res.json({ received: true }); return; }

        await supabase.from('formation_achats').update({
          paid_at: new Date().toISOString(),
          stripe_payment_intent: session.payment_intent as string,
        }).eq('id', (achat as { id: string }).id);

        res.json({ received: true }); return;
      }

      // ── Devis ────────────────────────────────────────────────────────────
      const devisId = session.metadata?.devis_id;
      if (!devisId) { res.json({ received: true }); return; }

      // Fetch the devis
      const { data: devis } = await supabase.from('devis').select('*').eq('id', devisId).single();
      if (!devis) { res.json({ received: true }); return; }

      const d = devis as {
        id: string; statut: string; paid_at?: string;
        client_prenom: string; client_nom: string; client_email: string;
        prestation_nom: string; duree: number; nb_seances: number;
        prix_par_seance: number; total: number; notes?: string;
        validite_date: string; facture_numero?: string; facture_date?: string;
        created_at: string;
      };

      // Idempotency guard
      if (d.paid_at || d.statut === 'paye') { res.json({ received: true }); return; }

      const now = new Date();
      const paidAt = now.toISOString();
      const factureDate = format(now, 'd MMMM yyyy', { locale: fr });

      // Update devis to paye
      await supabase.from('devis').update({
        statut: 'paye',
        paid_at: paidAt,
        stripe_payment_intent: session.payment_intent as string,
      }).eq('id', devisId);

      // Generate facture PDF and send by email (fire-and-forget)
      try {
        const emissionDate = d.facture_date
          ? format(new Date(d.facture_date), 'd MMMM yyyy', { locale: fr })
          : factureDate;

        const pdfBuffer = await generateDevisPdf({
          devisNum: d.facture_numero || `FAC-${format(now, 'yyyyMM')}-${devisId.slice(0, 6).toUpperCase()}`,
          prenom: d.client_prenom,
          nom: d.client_nom,
          email: d.client_email,
          prestationNom: d.prestation_nom,
          duree: d.duree,
          nbSeances: d.nb_seances,
          prixParSeance: Number(d.prix_par_seance),
          total: Number(d.total),
          notes: d.notes,
          validiteDate: emissionDate,
          emissionDate,
          isFacture: true,
        });

        await sendFacturePdfEmail({
          to: d.client_email,
          prenom: d.client_prenom,
          factureNum: d.facture_numero || 'FAC',
          prestationNom: d.prestation_nom,
          duree: d.duree,
          nbSeances: d.nb_seances,
          prixParSeance: Number(d.prix_par_seance),
          total: Number(d.total),
          factureDate: emissionDate,
          pdfBuffer,
        });
      } catch {
        // Email failure is not critical — devis is already marked paye
      }
    }

    res.json({ received: true });
  },
);
