import 'dotenv/config';
import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const email = process.argv[2] || 'admin@synego.fr';
  const password = process.argv[3] || 'Synego2026!';
  const nom = process.argv[4] || 'Admin';

  const hash = await bcrypt.hash(password, 12);
  const { data, error } = await supabase
    .from('admins')
    .insert({ email, mot_de_passe: hash, nom })
    .select('id,email').single();

  if (error) { console.error('Erreur:', error.message); process.exit(1); }
  console.log('Admin créé :', data);
  console.log(`Email: ${email}\nMot de passe: ${password}`);
}

main();
