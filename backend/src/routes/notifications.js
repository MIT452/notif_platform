import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { wrap } from '../middleware/error.js';
import { createNotification } from '../services/notify.js';

const router = Router();
router.use(requireAuth);

/* ---------- Côté utilisateur ---------- */

router.get('/me', wrap(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;
  const [items] = await pool.query(
    `SELECT n.id, n.title, n.body, n.type, n.created_at, nu.is_read, nu.read_at
       FROM notification_user nu JOIN notifications n ON n.id = nu.notification_id
      WHERE nu.user_id = ? ORDER BY n.created_at DESC, n.id DESC LIMIT ? OFFSET ?`,
    [req.user.id, limit, offset]
  );
  const [[{ unread }]] = await pool.query(
    'SELECT COUNT(*) AS unread FROM notification_user WHERE user_id = ? AND is_read = 0', [req.user.id]
  );
  res.json({ items: items.map((i) => ({ ...i, is_read: !!i.is_read })), unread });
}));

router.patch('/me/read-all', wrap(async (req, res) => {
  await pool.query('UPDATE notification_user SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0', [req.user.id]);
  res.json({ ok: true });
}));

router.patch('/:id/read', wrap(async (req, res) => {
  await pool.query(
    'UPDATE notification_user SET is_read = 1, read_at = NOW() WHERE notification_id = ? AND user_id = ?',
    [Number(req.params.id), req.user.id]
  );
  res.json({ ok: true });
}));

/* ---------- Côté admin ---------- */

const createSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).optional(),
  type: z.enum(['info', 'success', 'warning', 'alert']).optional(),
  templateId: z.number().int().optional(),
  vars: z.record(z.union([z.string(), z.number()])).default({}),
  targetType: z.enum(['all', 'user']).default('all'),
  targetUserId: z.number().int().optional(),
  channels: z.array(z.enum(['inapp', 'email', 'push'])).min(1).optional(),
  scheduledAt: z.string().datetime().optional(), // ISO 8601
});

router.post('/', requireAdmin, wrap(async (req, res) => {
  const data = createSchema.parse(req.body);
  const result = await createNotification(data, req.user.id);
  res.status(201).json(result);
}));

router.get('/', requireAdmin, wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT n.id, n.title, n.type, n.target_type, n.channels, n.status, n.scheduled_at, n.created_at,
            (SELECT COUNT(*) FROM notification_user x WHERE x.notification_id = n.id) AS recipients,
            (SELECT COUNT(*) FROM notification_user x WHERE x.notification_id = n.id AND x.is_read = 1) AS reads,
            (SELECT COUNT(*) FROM delivery_logs d WHERE d.notification_id = n.id AND d.status = 'sent') AS delivered,
            (SELECT COUNT(*) FROM delivery_logs d WHERE d.notification_id = n.id AND d.status = 'failed') AS failed
       FROM notifications n ORDER BY n.created_at DESC, n.id DESC LIMIT 100`
  );
  res.json(rows);
}));

router.get('/:id/logs', requireAdmin, wrap(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT d.id, d.channel, d.status, d.error, d.created_at, u.name AS user_name, u.email
       FROM delivery_logs d JOIN users u ON u.id = d.user_id
      WHERE d.notification_id = ? ORDER BY d.id DESC LIMIT 200`,
    [Number(req.params.id)]
  );
  res.json(rows);
}));

export default router;
