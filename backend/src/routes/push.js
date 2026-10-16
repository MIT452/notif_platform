import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { wrap } from '../middleware/error.js';

const router = Router();

router.get('/public-key', (req, res) => res.json({ publicKey: env.vapid.publicKey }));

router.post('/subscribe', requireAuth, wrap(async (req, res) => {
  const s = z.object({
    endpoint: z.string().url().max(500),
    keys: z.object({ p256dh: z.string(), auth: z.string() }),
  }).parse(req.body);
  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), p256dh = VALUES(p256dh), auth = VALUES(auth)`,
    [req.user.id, s.endpoint, s.keys.p256dh, s.keys.auth]
  );
  res.status(201).json({ ok: true });
}));

router.post('/unsubscribe', requireAuth, wrap(async (req, res) => {
  const { endpoint } = z.object({ endpoint: z.string() }).parse(req.body);
  await pool.query('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?', [endpoint, req.user.id]);
  res.json({ ok: true });
}));

export default router;
