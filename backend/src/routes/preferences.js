import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { wrap } from '../middleware/error.js';

const router = Router();
router.use(requireAuth);

const CHANNELS = ['inapp', 'email', 'push'];

router.get('/', wrap(async (req, res) => {
  const [rows] = await pool.query('SELECT channel, enabled FROM preferences WHERE user_id = ?', [req.user.id]);
  const map = Object.fromEntries(CHANNELS.map((c) => [c, true])); // activé par défaut
  rows.forEach((r) => (map[r.channel] = !!r.enabled));
  res.json(map);
}));

router.put('/', wrap(async (req, res) => {
  const { channel, enabled } = z.object({ channel: z.enum(['inapp', 'email', 'push']), enabled: z.boolean() }).parse(req.body);
  await pool.query(
    `INSERT INTO preferences (user_id, channel, enabled) VALUES (?,?,?)
     ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)`,
    [req.user.id, channel, enabled ? 1 : 0]
  );
  res.json({ channel, enabled });
}));

export default router;
