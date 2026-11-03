import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { supabase } from '../lib/supabase';

export const authRouter = Router();

// POST /api/auth/login — vérifie admin puis client
authRouter.post('/login', async (req, res) => {
  const parsed = z.object({ email: z.string().email(), mot_de_passe: z.string() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Données invalides' }); return; }
  const { email, mot_de_passe } = parsed.data;

  // 1. Essayer admin
  const { data: admin } = await supabase
    .from('admins').select('id,email,mot_de_passe,nom').eq('email', email).single();

  if (admin && (admin as { mot_de_passe: string }).mot_de_passe) {
    const ok = await bcrypt.compare(mot_de_passe, (admin as { mot_de_passe: string }).mot_de_passe);
    if (ok) {
      const token = jwt.sign({ id: (admin as { id: number }).id, email }, process.env.JWT_SECRET!, { expiresIn: '8h' });
      res.json({ token, role: 'admin', nom: (admin as { nom: string }).nom });
      return;
    }
  }

  // 2. Essayer client
  const { data: client } = await supabase
    .from('clients').select('id,email,mot_de_passe,nom,prenom,compte_actif').eq('email', email).single();

  if (client && (client as { compte_actif: boolean }).compte_actif && (client as { mot_de_passe: string }).mot_de_passe) {
    const ok = await bcrypt.compare(mot_de_passe, (client as { mot_de_passe: string }).mot_de_passe);
    if (ok) {
      const token = jwt.sign({ id: (client as { id: number }).id, email, role: 'client' }, process.env.JWT_SECRET!, { expiresIn: '30d' });
      res.json({
        token,
        role: 'client',
        id: (client as { id: number }).id,
        prenom: (client as { prenom: string }).prenom,
        nom: (client as { nom: string }).nom,
      });
      return;
    }
  }

  res.status(401).json({ error: 'Identifiants incorrects.' });
});
