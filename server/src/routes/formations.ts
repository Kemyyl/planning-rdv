import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';

// ── Slug generation ────────────────────────────────────────────────────────
function makeSlug(titre: string): string {
  return titre.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Stripe lazy init (local — avoids circular deps with stripe.ts) ─────────
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-10-28.endive' as never });
  return _stripe;
}

// ── Client auth (same pattern as stripe.ts / client.ts) ───────────────────
interface ClientReq extends Request { clientId: number; clientEmail: string }

function requireClientAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: 'Non autorisé' }); return; }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as { id: number; email: string; role: string };
    if (payload.role !== 'client') { res.status(403).json({ error: 'Accès refusé' }); return; }
    (req as ClientReq).clientId = payload.id;
    (req as ClientReq).clientEmail = payload.email;
    next();
  } catch { res.status(401).json({ error: 'Jeton invalide' }); }
}

// ══════════════════════════════════════════════════════════════════════════
// PUBLIC ROUTER
// ══════════════════════════════════════════════════════════════════════════
export const formationsPublicRouter = Router();

// GET /api/public/formations — liste des formations publiées avec count modules
formationsPublicRouter.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('formations')
    .select('id,titre,slug,description,prix,image_url,duree_heures,created_at,formation_modules(count)')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }

  const mapped = (data || []).map((f: Record<string, unknown>) => ({
    ...f,
    modules_count: Array.isArray(f.formation_modules)
      ? (f.formation_modules as Array<{ count: number }>)[0]?.count ?? 0
      : 0,
    formation_modules: undefined,
  }));

  res.json(mapped);
});

// GET /api/public/formations/:slug — une formation publiée avec ses modules
// Si header Authorization présent et valide → client authentifié → renvoie tous les modules s'il a acheté
formationsPublicRouter.get('/:slug', async (req, res) => {
  const { slug } = req.params;

  const { data: formation, error } = await supabase
    .from('formations')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error || !formation) { res.status(404).json({ error: 'Formation introuvable' }); return; }

  const f = formation as { id: string };

  // Vérifier si le client est authentifié et a acheté la formation
  let clientHasBought = false;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET!) as { id: number; email: string; role: string };
      if (payload.role === 'client') {
        const { data: achat } = await supabase
          .from('formation_achats')
          .select('id')
          .eq('formation_id', f.id)
          .eq('client_email', payload.email)
          .not('paid_at', 'is', null)
          .single();
        clientHasBought = !!achat;
      }
    } catch { /* JWT invalide → pas authentifié */ }
  }

  // Modules : tous si acheté, sinon seulement les is_free
  let modulesQuery = supabase
    .from('formation_modules')
    .select('id,titre,ordre,duree_minutes,is_free,video_url,contenu')
    .eq('formation_id', f.id)
    .order('ordre');

  if (!clientHasBought) {
    modulesQuery = modulesQuery.eq('is_free', true);
  }

  const { data: modules } = await modulesQuery;

  res.json({ ...formation, modules: modules || [], client_has_bought: clientHasBought });
});

// ══════════════════════════════════════════════════════════════════════════
// ADMIN ROUTER
// ══════════════════════════════════════════════════════════════════════════
export const formationsAdminRouter = Router();
formationsAdminRouter.use(requireAuth);

// GET /api/admin/formations — toutes les formations avec counts
formationsAdminRouter.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('formations')
    .select('id,titre,slug,description,prix,image_url,duree_heures,is_published,created_at,formation_modules(count),formation_achats(count)')
    .order('created_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }

  const mapped = (data || []).map((f: Record<string, unknown>) => ({
    ...f,
    modules_count: Array.isArray(f.formation_modules)
      ? (f.formation_modules as Array<{ count: number }>)[0]?.count ?? 0
      : 0,
    achats_count: Array.isArray(f.formation_achats)
      ? (f.formation_achats as Array<{ count: number }>)[0]?.count ?? 0
      : 0,
    formation_modules: undefined,
    formation_achats: undefined,
  }));

  res.json(mapped);
});

// POST /api/admin/formations — créer une formation
formationsAdminRouter.post('/', async (req, res) => {
  const { titre, description, prix, image_url, duree_heures } = req.body;
  if (!titre?.trim()) { res.status(400).json({ error: 'Le titre est requis' }); return; }

  const slug = makeSlug(titre);

  const { data, error } = await supabase
    .from('formations')
    .insert({
      titre: titre.trim(),
      slug,
      description: description?.trim() ?? null,
      prix: prix !== undefined ? Number(prix) : null,
      image_url: image_url?.trim() ?? null,
      duree_heures: duree_heures !== undefined ? Number(duree_heures) : null,
      is_published: false,
    })
    .select('*')
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// GET /api/admin/formations/:id — formation avec ses modules
formationsAdminRouter.get('/:id', async (req, res) => {
  const { data: formation, error } = await supabase
    .from('formations')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !formation) { res.status(404).json({ error: 'Formation introuvable' }); return; }

  const { data: modules } = await supabase
    .from('formation_modules')
    .select('*')
    .eq('formation_id', req.params.id)
    .order('ordre');

  res.json({ ...formation, modules: modules || [] });
});

// PATCH /api/admin/formations/:id — mettre à jour une formation
formationsAdminRouter.patch('/:id', async (req, res) => {
  const allowed = ['titre', 'description', 'prix', 'image_url', 'duree_heures', 'is_published', 'slug'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

  // Regénérer le slug si le titre change et qu'aucun slug n'est fourni explicitement
  if (update.titre && !update.slug) {
    update.slug = makeSlug(update.titre as string);
  }

  if (Object.keys(update).length === 0) { res.status(400).json({ error: 'Rien à mettre à jour' }); return; }

  const { data, error } = await supabase
    .from('formations')
    .update(update)
    .eq('id', req.params.id)
    .select('*')
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// DELETE /api/admin/formations/:id — supprimer une formation
formationsAdminRouter.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('formations').delete().eq('id', req.params.id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

// PATCH /api/admin/formations/:id/publier — toggle is_published
formationsAdminRouter.patch('/:id/publier', async (req, res) => {
  const { data: existing, error: fetchErr } = await supabase
    .from('formations')
    .select('is_published')
    .eq('id', req.params.id)
    .single();

  if (fetchErr || !existing) { res.status(404).json({ error: 'Formation introuvable' }); return; }

  const newState = !(existing as { is_published: boolean }).is_published;

  const { data, error } = await supabase
    .from('formations')
    .update({ is_published: newState })
    .eq('id', req.params.id)
    .select('id,is_published')
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// POST /api/admin/formations/:id/modules — ajouter un module
formationsAdminRouter.post('/:id/modules', async (req, res) => {
  const { titre, contenu, video_url, duree_minutes, is_free } = req.body;
  if (!titre?.trim()) { res.status(400).json({ error: 'Le titre du module est requis' }); return; }

  // Calculer l'ordre automatiquement : max + 1
  const { data: maxRow } = await supabase
    .from('formation_modules')
    .select('ordre')
    .eq('formation_id', req.params.id)
    .order('ordre', { ascending: false })
    .limit(1)
    .single();

  const ordre = ((maxRow as { ordre: number } | null)?.ordre ?? 0) + 1;

  const { data, error } = await supabase
    .from('formation_modules')
    .insert({
      formation_id: req.params.id,
      titre: titre.trim(),
      ordre,
      contenu: contenu?.trim() ?? null,
      video_url: video_url?.trim() ?? null,
      duree_minutes: duree_minutes !== undefined ? Number(duree_minutes) : null,
      is_free: is_free === true || is_free === 'true',
    })
    .select('*')
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// PATCH /api/admin/formations/:id/modules/:moduleId — modifier un module
formationsAdminRouter.patch('/:id/modules/:moduleId', async (req, res) => {
  const allowed = ['titre', 'contenu', 'video_url', 'duree_minutes', 'is_free', 'ordre'];
  const update: Record<string, unknown> = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

  if (Object.keys(update).length === 0) { res.status(400).json({ error: 'Rien à mettre à jour' }); return; }

  const { data, error } = await supabase
    .from('formation_modules')
    .update(update)
    .eq('id', req.params.moduleId)
    .eq('formation_id', req.params.id)
    .select('*')
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// DELETE /api/admin/formations/:id/modules/:moduleId — supprimer un module
formationsAdminRouter.delete('/:id/modules/:moduleId', async (req, res) => {
  const { error } = await supabase
    .from('formation_modules')
    .delete()
    .eq('id', req.params.moduleId)
    .eq('formation_id', req.params.id);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

// GET /api/admin/formations/:id/etudiants — clients ayant acheté la formation
formationsAdminRouter.get('/:id/etudiants', async (req, res) => {
  const { data, error } = await supabase
    .from('formation_achats')
    .select('id,client_email,client_id,paid_at,created_at,stripe_payment_intent,client:clients(prenom,nom,email)')
    .eq('formation_id', req.params.id)
    .not('paid_at', 'is', null)
    .order('paid_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data || []);
});

// ══════════════════════════════════════════════════════════════════════════
// CLIENT ROUTER
// ══════════════════════════════════════════════════════════════════════════
export const formationsClientRouter = Router();

// GET /api/client/formations/mes-formations — formations achetées par ce client
// IMPORTANT: cette route doit être AVANT /:id pour éviter le conflit de paramètre
formationsClientRouter.get('/mes-formations', requireClientAuth, async (req, res) => {
  const clientId = (req as ClientReq).clientId;
  const clientEmail = (req as ClientReq).clientEmail;

  const { data: achats, error } = await supabase
    .from('formation_achats')
    .select('formation_id,paid_at,formation:formations(id,titre,slug,description,prix,image_url,duree_heures,is_published)')
    .or(`client_id.eq.${clientId},client_email.ilike.${clientEmail}`)
    .not('paid_at', 'is', null)
    .order('paid_at', { ascending: false });

  if (error) { res.status(500).json({ error: error.message }); return; }

  // Pour chaque formation, récupérer le count de modules terminés
  const result = await Promise.all(
    (achats || []).map(async (achat: Record<string, unknown>) => {
      const formationId = achat.formation_id as string;
      const { count: progresCount } = await supabase
        .from('formation_progres')
        .select('id', { count: 'exact', head: true })
        .eq('formation_id', formationId)
        .eq('client_id', clientId)
        .eq('termine', true);

      return {
        ...achat,
        progres_count: progresCount ?? 0,
      };
    })
  );

  res.json(result);
});

// POST /api/client/formations/:id/checkout — créer session Stripe Checkout
formationsClientRouter.post('/:id/checkout', requireClientAuth, async (req, res) => {
  const clientId = (req as ClientReq).clientId;
  const clientEmail = (req as ClientReq).clientEmail;
  const formationId = req.params.id;

  // Récupérer la formation
  const { data: formation, error: formErr } = await supabase
    .from('formations')
    .select('id,titre,prix,is_published')
    .eq('id', formationId)
    .single();

  if (formErr || !formation) { res.status(404).json({ error: 'Formation introuvable' }); return; }

  const f = formation as { id: string; titre: string; prix: number; is_published: boolean };
  if (!f.is_published) { res.status(400).json({ error: 'Formation non disponible' }); return; }
  if (!f.prix || f.prix <= 0) { res.status(400).json({ error: 'Prix invalide pour cette formation' }); return; }

  // Vérifier qu'il n'a pas déjà acheté
  const { data: achatExistant } = await supabase
    .from('formation_achats')
    .select('id,paid_at')
    .eq('formation_id', formationId)
    .eq('client_email', clientEmail)
    .single();

  if (achatExistant && (achatExistant as { paid_at: string | null }).paid_at) {
    res.status(400).json({ error: 'Vous avez déjà acheté cette formation' }); return;
  }

  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: Math.round(Number(f.prix) * 100),
          product_data: {
            name: f.titre,
            description: `Formation Synégo — ${f.titre}`,
          },
        },
        quantity: 1,
      }],
      customer_email: clientEmail,
      success_url: `${appUrl}/mes-formations?payment=success`,
      cancel_url: `${appUrl}/formations`,
      metadata: {
        formation_id: f.id,
        client_id: String(clientId),
        client_email: clientEmail,
        type: 'formation',
      },
    });

    // Sauvegarder ou mettre à jour la ligne dans formation_achats
    if (achatExistant) {
      // Mise à jour de la session (si achat existant non payé)
      await supabase
        .from('formation_achats')
        .update({ stripe_session_id: session.id })
        .eq('id', (achatExistant as { id: string }).id);
    } else {
      await supabase.from('formation_achats').insert({
        formation_id: f.id,
        client_id: clientId,
        client_email: clientEmail,
        stripe_session_id: session.id,
      });
    }

    res.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur Stripe';
    res.status(500).json({ error: msg });
  }
});

// GET /api/client/formations/:id/acces — accès complet si acheté
formationsClientRouter.get('/:id/acces', requireClientAuth, async (req, res) => {
  const clientId = (req as ClientReq).clientId;
  const clientEmail = (req as ClientReq).clientEmail;
  const formationId = req.params.id;

  // Vérifier l'achat payé
  const { data: achat } = await supabase
    .from('formation_achats')
    .select('id,paid_at')
    .eq('formation_id', formationId)
    .or(`client_id.eq.${clientId},client_email.ilike.${clientEmail}`)
    .not('paid_at', 'is', null)
    .single();

  if (!achat) { res.status(403).json({ error: 'Accès refusé — achetez cette formation pour y accéder' }); return; }

  // Récupérer la formation
  const { data: formation, error: formErr } = await supabase
    .from('formations')
    .select('*')
    .eq('id', formationId)
    .single();

  if (formErr || !formation) { res.status(404).json({ error: 'Formation introuvable' }); return; }

  // Récupérer tous les modules
  const { data: modules } = await supabase
    .from('formation_modules')
    .select('*')
    .eq('formation_id', formationId)
    .order('ordre');

  // Récupérer la progression du client
  const { data: progres } = await supabase
    .from('formation_progres')
    .select('module_id,termine,termine_at')
    .eq('formation_id', formationId)
    .eq('client_id', clientId);

  res.json({
    ...formation,
    modules: modules || [],
    progres: progres || [],
  });
});

// PATCH /api/client/formations/:id/modules/:moduleId/terminer — marquer module terminé
formationsClientRouter.patch('/:id/modules/:moduleId/terminer', requireClientAuth, async (req, res) => {
  const clientId = (req as ClientReq).clientId;
  const clientEmail = (req as ClientReq).clientEmail;
  const { id: formationId, moduleId } = req.params;

  // Vérifier l'achat payé
  const { data: achat } = await supabase
    .from('formation_achats')
    .select('id')
    .eq('formation_id', formationId)
    .or(`client_id.eq.${clientId},client_email.ilike.${clientEmail}`)
    .not('paid_at', 'is', null)
    .single();

  if (!achat) { res.status(403).json({ error: 'Accès refusé' }); return; }

  // Vérifier que le module appartient bien à cette formation
  const { data: module } = await supabase
    .from('formation_modules')
    .select('id')
    .eq('id', moduleId)
    .eq('formation_id', formationId)
    .single();

  if (!module) { res.status(404).json({ error: 'Module introuvable' }); return; }

  // Upsert dans formation_progres
  const { data, error } = await supabase
    .from('formation_progres')
    .upsert({
      formation_id: formationId,
      module_id: moduleId,
      client_id: clientId,
      termine: true,
      termine_at: new Date().toISOString(),
    }, { onConflict: 'module_id,client_id' })
    .select('*')
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});
