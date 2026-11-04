import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Images Unsplash libres, sélectionnées pour coller au thème de chaque formation
const IMAGES: Record<string, string> = {
  'gerer-son-stress-au-quotidien':
    'https://images.unsplash.com/photo-1545389336-cf090694435e?w=1200&q=80&auto=format&fit=crop',
  'reconstruire-sa-confiance-en-soi':
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&q=80&auto=format&fit=crop',
  'comprendre-et-prevenir-le-burn-out':
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&q=80&auto=format&fit=crop',
  'accueillir-ses-emotions':
    'https://images.unsplash.com/photo-1516302752625-fcc3c50ae61f?w=1200&q=80&auto=format&fit=crop',
  'traverser-une-transition-de-vie':
    'https://images.unsplash.com/photo-1476820865390-c52aeebb9891?w=1200&q=80&auto=format&fit=crop',
  'introduction-a-la-pleine-conscience':
    'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=1200&q=80&auto=format&fit=crop',
};

async function main() {
  console.log('🖼  Mise à jour des images de formations...\n');

  for (const [slug, url] of Object.entries(IMAGES)) {
    const { data, error } = await supabase
      .from('formations')
      .update({ image_url: url })
      .eq('slug', slug)
      .select('titre')
      .single();

    if (error) {
      console.error(`❌ ${slug}: ${error.message}`);
      continue;
    }
    if (!data) {
      console.log(`⏭  ${slug}: formation introuvable — ignorée`);
      continue;
    }
    console.log(`✅ ${(data as { titre: string }).titre}`);
  }

  console.log('\n🎉 Images mises à jour.');
}

main().catch(e => { console.error(e); process.exit(1); });
