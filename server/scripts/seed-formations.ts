import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function makeSlug(titre: string): string {
  return titre.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

interface SeedModule {
  titre: string;
  contenu: string;
  duree_minutes: number;
  is_free?: boolean;
}

interface SeedFormation {
  titre: string;
  description: string;
  prix: number;
  duree_heures: number;
  is_published: boolean;
  modules: SeedModule[];
}

const FORMATIONS: SeedFormation[] = [
  {
    titre: 'Gérer son stress au quotidien',
    description: "Identifier vos déclencheurs, apprendre des techniques de régulation immédiate (respiration, ancrage, cohérence cardiaque) et mettre en place des routines durables pour retrouver sérénité et énergie.",
    prix: 89,
    duree_heures: 3,
    is_published: true,
    modules: [
      { titre: 'Comprendre le stress — mécanismes et déclencheurs', contenu: "Les trois phases de la réponse au stress, identifier vos propres déclencheurs, cartographier vos réactions automatiques.", duree_minutes: 40, is_free: true },
      { titre: 'Techniques de respiration et cohérence cardiaque', contenu: "Protocole 365, respiration carrée, cohérence cardiaque — exercices guidés pour revenir au calme en moins de 3 minutes.", duree_minutes: 45 },
      { titre: 'Rituels anti-stress au quotidien', contenu: "Construire vos rituels matin, midi, soir. Micro-pauses, ancrages sensoriels, gestion des pics de tension.", duree_minutes: 50 },
      { titre: 'Plan d\'action personnalisé sur 21 jours', contenu: "Définir vos trois leviers prioritaires, construire votre planning anti-stress, mesurer vos progrès.", duree_minutes: 45 },
    ],
  },
  {
    titre: 'Reconstruire sa confiance en soi',
    description: "Un parcours en 6 modules pour désamorcer le dialogue intérieur critique, poser ses limites et retrouver une estime de soi solide, durable et bienveillante.",
    prix: 149,
    duree_heures: 5,
    is_published: true,
    modules: [
      { titre: 'Les racines de la confiance', contenu: "D'où vient votre manque de confiance ? Histoire personnelle, croyances limitantes, scripts intérieurs.", duree_minutes: 50, is_free: true },
      { titre: 'Déjouer l\'auto-sabotage', contenu: "Reconnaître les patterns d'auto-sabotage, comprendre leur fonction, s'en libérer sans violence.", duree_minutes: 50 },
      { titre: 'Poser ses limites sainement', contenu: "Dire non sans culpabiliser, identifier vos limites, les communiquer avec assertivité.", duree_minutes: 50 },
      { titre: 'L\'affirmation de soi', contenu: "Techniques d'expression, prise de parole, gestion des conflits — passer à l'action.", duree_minutes: 50 },
      { titre: 'Célébrer ses victoires', contenu: "Pratique de la gratitude envers soi, journal de réussites, ancrage des progrès.", duree_minutes: 45 },
      { titre: 'Ancrages quotidiens', contenu: "Vos rituels de confiance : affirmations, visualisation, routine du matin, bilan du soir.", duree_minutes: 45 },
    ],
  },
  {
    titre: 'Comprendre et prévenir le burn-out',
    description: "Reconnaître les signaux précoces d'épuisement, comprendre les mécanismes personnels et professionnels à l'origine, et construire un cadre de vie protecteur pour durer dans ses engagements.",
    prix: 199,
    duree_heures: 6,
    is_published: true,
    modules: [
      { titre: 'Les 3 phases du burn-out', contenu: "Alarme, résistance, épuisement : comprendre le cycle complet et où vous vous situez.", duree_minutes: 55, is_free: true },
      { titre: 'Identifier ses signaux personnels', contenu: "Signes physiques, émotionnels, cognitifs et comportementaux — votre carte d'alerte personnalisée.", duree_minutes: 60 },
      { titre: 'Équilibre vie pro / vie perso', contenu: "Reconstruire une frontière saine, apprendre à déconnecter, protéger votre temps.", duree_minutes: 60 },
      { titre: 'Gérer le perfectionnisme', contenu: "Le perfectionnisme comme carburant du burn-out — comment viser l'excellence sans se brûler.", duree_minutes: 55 },
      { titre: 'Reconstruire son énergie', contenu: "Sommeil, nutrition, mouvement, relations — les quatre piliers de la récupération.", duree_minutes: 55 },
      { titre: 'Prévenir la rechute', contenu: "Signaux d'alerte, rituels de vigilance, plan d'action en cas de surcharge.", duree_minutes: 55 },
    ],
  },
  {
    titre: 'Accueillir ses émotions',
    description: "Un parcours court et pratique pour reconnaître, accueillir et réguler vos émotions au lieu de les subir. Idéal pour débuter un travail émotionnel.",
    prix: 69,
    duree_heures: 2.5,
    is_published: true,
    modules: [
      { titre: 'Le langage des émotions', contenu: "Les émotions fondamentales, leurs messages, pourquoi elles existent.", duree_minutes: 35, is_free: true },
      { titre: 'Pleine conscience émotionnelle', contenu: "Observer sans juger, nommer pour apprivoiser, l'approche RAIN.", duree_minutes: 40 },
      { titre: 'Techniques de régulation', contenu: "Respiration, mouvement, écriture, dialogue intérieur — votre boîte à outils.", duree_minutes: 40 },
      { titre: 'Exercices guidés', contenu: "Trois exercices audio à refaire à volonté pour ancrer la pratique.", duree_minutes: 35 },
    ],
  },
  {
    titre: 'Traverser une transition de vie',
    description: "Rupture, reconversion, deuil, parentalité — un accompagnement structuré en 7 étapes pour traverser les grands bouleversements de votre vie avec clarté et sens.",
    prix: 249,
    duree_heures: 7,
    is_published: true,
    modules: [
      { titre: 'Comprendre la transition', contenu: "Les 4 phases de toute transition selon William Bridges. Où êtes-vous aujourd'hui ?", duree_minutes: 55, is_free: true },
      { titre: 'Faire le deuil de l\'ancien', contenu: "Reconnaître ce qui se termine, honorer, laisser partir — les étapes du deuil.", duree_minutes: 60 },
      { titre: 'Clarifier ses valeurs', contenu: "Quelles valeurs veulent émerger dans cette nouvelle phase ? Exercices d'exploration.", duree_minutes: 60 },
      { titre: 'Explorer les possibles', contenu: "Techniques de divergence créative pour ne pas rester bloqué dans une seule vision.", duree_minutes: 60 },
      { titre: 'Construire son projet', contenu: "De l'intention à l'action concrète : vision, étapes, ressources, obstacles anticipés.", duree_minutes: 60 },
      { titre: 'Passer à l\'action', contenu: "Lever les freins, décomposer les premiers pas, demander du soutien.", duree_minutes: 55 },
      { titre: 'Ancrer le changement', contenu: "Transformer l'essai en routine, célébrer les étapes, éviter les rechutes.", duree_minutes: 50 },
    ],
  },
  {
    titre: 'Introduction à la pleine conscience',
    description: "Un parcours d'introduction offert pour découvrir la méthode avant de vous engager dans un parcours complet. Idéal si vous êtes curieux(se) ou débutant(e).",
    prix: 0,
    duree_heures: 1,
    is_published: true,
    modules: [
      { titre: 'Qu\'est-ce que la pleine conscience ?', contenu: "Les principes, les bénéfices scientifiquement validés, les idées reçues à écarter.", duree_minutes: 20, is_free: true },
      { titre: 'Première méditation guidée', contenu: "Un exercice de 15 minutes pour expérimenter la pratique dès maintenant.", duree_minutes: 20, is_free: true },
      { titre: 'Intégrer la pratique au quotidien', contenu: "Comment commencer avec 5 minutes par jour et faire durer la pratique dans le temps.", duree_minutes: 20, is_free: true },
    ],
  },
];

async function main() {
  console.log('🌱 Seed des formations Synégo...\n');

  for (const f of FORMATIONS) {
    const slug = makeSlug(f.titre);

    // Vérifier si la formation existe déjà (par slug)
    const { data: existing } = await supabase
      .from('formations')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      console.log(`⏭  "${f.titre}" existe déjà (slug: ${slug}) — ignorée`);
      continue;
    }

    // Insérer la formation
    const { data: formation, error: formErr } = await supabase
      .from('formations')
      .insert({
        titre: f.titre,
        slug,
        description: f.description,
        prix: f.prix,
        duree_heures: f.duree_heures,
        is_published: f.is_published,
      })
      .select('id')
      .single();

    if (formErr || !formation) {
      console.error(`❌ Erreur insertion "${f.titre}":`, formErr?.message);
      continue;
    }

    const formationId = (formation as { id: string }).id;

    // Insérer les modules
    const modulesToInsert = f.modules.map((m, i) => ({
      formation_id: formationId,
      titre: m.titre,
      ordre: i + 1,
      contenu: m.contenu,
      duree_minutes: m.duree_minutes,
      is_free: m.is_free ?? false,
    }));

    const { error: modErr } = await supabase.from('formation_modules').insert(modulesToInsert);

    if (modErr) {
      console.error(`❌ Erreur insertion modules de "${f.titre}":`, modErr.message);
      continue;
    }

    console.log(`✅ "${f.titre}" — ${f.prix}€ — ${f.modules.length} modules`);
  }

  console.log('\n🎉 Seed terminé.');
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
