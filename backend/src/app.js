import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { notFound, errorHandler } from './middleware/error.js';
import auth from './routes/auth.js';
import notifications from './routes/notifications.js';
import templates from './routes/templates.js';
import preferences from './routes/preferences.js';
import push from './routes/push.js';
import admin from './routes/admin.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 300 }));
// Limite plus stricte sur l'authentification (anti brute-force)
app.use('/api/auth', rateLimit({ windowMs: 15 * 60_000, limit: 50 }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', auth);
app.use('/api/notifications', notifications);
app.use('/api/templates', templates);
app.use('/api/preferences', preferences);
app.use('/api/push', push);
app.use('/api/admin', admin);

app.use(notFound);
app.use(errorHandler);
