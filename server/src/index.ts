import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { publicRouter } from './routes/public';
import { adminRouter } from './routes/admin';
import { clientRouter } from './routes/client';
import { authRouter } from './routes/auth';
import { startCron } from './lib/cron';

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

const allowedOrigins = isProd
  ? [process.env.APP_URL].filter(Boolean) as string[]
  : ['http://localhost:5173', 'http://localhost:4173'];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/public', publicRouter);
app.use('/api/admin', adminRouter);
app.use('/api/client', clientRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

if (isProd) {
  // En production, le serveur sert aussi le client React compilé
  const clientDist = path.resolve(__dirname, '../../../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`API Synégo démarrée sur http://localhost:${PORT}`);
  startCron();
});
