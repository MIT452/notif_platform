import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { wrap } from '../middleware/error.js';
import { queues, jobOptions } from '../queue.js';

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
  type: z.enum(['info', 'success', 'warning', 'alert']).default('info'),
  templateId: z.number().int().optional(),
  targetType: z.enum(['all', 'user']).default('all'),
  targetUserId: z.number().int().optional(),
  channels: z.array(z.enum(['inapp', 'email', 'push'])).min(1).default(['inapp']),
  scheduledAt: z.string().datetime().optional(), // ISO 8601
});

router.post('/', requireAdmin, wrap(async (req, res) => {
  const data = createSchema.parse(req.body);
  let { title, body } = data;

  if (data.templateId) {
    const [[tpl]] = await pool.query('SELECT * FROM templates WHERE id = ?', [data.templateId]);
    if (!tpl) return res.status(404).json({ error: 'Template introuvable' });
    title = title || tpl.subject;
    body = body || tpl.body;
  }
  if (!title || !body) return res.status(400).json({ error: 'Titre et message requis (ou un template)' });
  if (data.targetType === 'user' && !data.targetUserId) {
    return res.status(400).json({ error: 'targetUserId requis pour un ciblage utilisateur' });
  }

  const scheduled = data.scheduledAt ? new Date(data.scheduledAt) : null;
  const delay = scheduled ? Math.max(scheduled.getTime() - Date.now(), 0) : 0;
  const status = delay > 0 ? 'scheduled' : 'processing';

  const [r] = await pool.query(
    `INSERT INTO notifications (title, body, type, template_id, target_type, target_user_id, channels, scheduled_at, status, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [title, body, data.type, data.templateId || null, data.targetType, data.targetUserId || null,
     JSON.stringify(data.channels), scheduled, status, req.user.id]
  );
  await queues.dispatch.add('dispatch', { notificationId: r.insertId }, { ...jobOptions, delay });
  res.status(201).json({ id: r.insertId, status });
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
