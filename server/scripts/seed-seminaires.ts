import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

interface SeedPrestation {
  nom: string;
  nom_en: string;
  description: string;
  description_en: string;
  duree: number;   // minutes
  prix: number;
  couleur: string;
}

const SEMINAIRES: SeedPrestation[] = [
  {
    nom: 'Séminaire Cohésion d\'équipe',
    nom_en: 'Team Cohesion Seminar',
    description: 'Journée dédiée à renforcer la cohésion de votre équipe : exercices collaboratifs, communication, confiance mutuelle. Idéal pour aligner votre équipe autour d\'objectifs communs (groupe 8-20 personnes).',
    description_en: 'A full day dedicated to strengthening team cohesion: collaborative exercises, communication, mutual trust. Ideal for aligning your team around shared goals (group of 8-20 people).',
    duree: 480,      // 8h = 1 journée
    prix: 1800,
    couleur: '#5B3FA6',
  },
  {
    nom: 'Séminaire Gestion du stress en entreprise',
    nom_en: 'Workplace Stress Management Seminar',
    description: 'Demi-journée pour outiller vos collaborateurs face au stress professionnel : techniques de régulation, prévention du burn-out, routines anti-stress. Format intensif et pragmatique (groupe 6-15 personnes).',
    description_en: 'Half-day session equipping your team to handle workplace stress: regulation techniques, burnout prevention, anti-stress routines. Intensive and pragmatic format (group of 6-15 people).',
    duree: 240,      // 4h = demi-journée
    prix: 1200,
    couleur: '#1A56A4',
  },
  {
    nom: 'Séminaire Leadership & Management',
    nom_en: 'Leadership & Management Seminar',
    description: 'Deux jours de formation intensive pour managers et dirigeants : posture de leader, management bienveillant, prise de décision, conduite du changement. Mix théorie, cas pratiques et mises en situation (groupe 4-12 personnes).',
    description_en: 'Two-day intensive training for managers and executives: leadership posture, mindful management, decision-making, change management. Mix of theory, case studies and role-play (group of 4-12 people).',
    duree: 960,      // 16h = 2 journées
    prix: 3600,
    couleur: '#8A5A12',
  },
];

async function main() {
  console.log('🎯 Seed des séminaires entreprise...\n');

  // Trouver l'ordre max existant pour empiler proprement
  const { data: existing } = await supabase
    .from('prestations')
    .select('ordre')
    .order('ordre', { ascending: false })
    .limit(1)
    .single();

  let nextOrdre = ((existing as { ordre: number } | null)?.ordre ?? 0) + 1;

  for (const s of SEMINAIRES) {
    // Vérifier si cette prestation existe déjà (par nom)
    const { data: existingPresta } = await supabase
      .from('prestations')
      .select('id')
      .eq('nom', s.nom)
      .single();

    if (existingPresta) {
      console.log(`⏭  "${s.nom}" existe déjà — ignorée`);
      continue;
    }

    const { data, error } = await supabase
      .from('prestations')
      .insert({
        nom: s.nom,
        nom_en: s.nom_en,
        description: s.description,
        description_en: s.description_en,
        duree: s.duree,
        prix: s.prix,
        couleur: s.couleur,
        actif: true,
        visible_client: true,
        ordre: nextOrdre++,
        type: 'seminaire',
      })
      .select('id,nom')
      .single();

    if (error) {
      console.error(`❌ ${s.nom}: ${error.message}`);
      continue;
    }

    const d = data as { id: number; nom: string };
    const dureeLabel = s.duree >= 480 ? `${s.duree / 480} j` : `${s.duree / 60} h`;
    console.log(`✅ [${d.id}] ${d.nom} — ${dureeLabel} — ${s.prix}€`);
  }

  console.log('\n🎉 Séminaires créés avec type="seminaire".');
}

main().catch(err => { console.error(err); process.exit(1); });
