import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AdminJwtPayload {
  id: number;
  email: string;
  role: 'admin';
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Non autorisé' });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET!) as Partial<AdminJwtPayload>;
    if (payload.role !== 'admin') {
      res.status(403).json({ error: 'Accès refusé' });
      return;
    }
    (req as Request & { admin: AdminJwtPayload }).admin = payload as AdminJwtPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Jeton invalide ou expiré' });
  }
}
