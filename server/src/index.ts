import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { publicRouter } from './routes/public';
import { adminRouter } from './routes/admin';
import { clientRouter } from './routes/client';
import { authRouter } from './routes/auth';
import { stripeRouter, stripeWebhookRouter } from './routes/stripe';
import { formationsPublicRouter, formationsAdminRouter, formationsClientRouter } from './routes/formations';
import { startCron } from './lib/cron';

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

const corsOrigin = isProd
  ? ([process.env.APP_URL].filter(Boolean) as string[])
  : true;

app.use(cors({ origin: corsOrigin }));

// Stripe webhook must receive raw body — mounted before express.json()
app.use('/api/stripe/webhook', stripeWebhookRouter);

app.use(express.json());

if (isProd) {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] === 'http') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    next();
  });
}

app.use('/api/auth', authRouter);
app.use('/api/public', publicRouter);
app.use('/api/admin', adminRouter);
app.use('/api/client', clientRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/public/formations', formationsPublicRouter);
app.use('/api/admin/formations', formationsAdminRouter);
app.use('/api/client/formations', formationsClientRouter);

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
