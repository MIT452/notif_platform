import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { wrap } from '../middleware/error.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/users', wrap(async (req, res) => {
  const [rows] = await pool.query('SELECT id, name, email, role FROM users ORDER BY name');
  res.json(rows);
}));

router.get('/stats', wrap(async (req, res) => {
  const [[t]] = await pool.query('SELECT COUNT(*) AS total FROM notifications');
  const [[d]] = await pool.query(
    `SELECT SUM(status='sent') AS delivered, SUM(status='failed') AS failed FROM delivery_logs`
  );
  const [[r]] = await pool.query(
    'SELECT COUNT(*) AS recipients, COALESCE(SUM(is_read),0) AS reads FROM notification_user'
  );
  const [byChannel] = await pool.query(
    `SELECT channel, SUM(status='sent') AS sent, SUM(status='failed') AS failed FROM delivery_logs GROUP BY channel`
  );
  res.json({
    notifications: t.total,
    delivered: Number(d.delivered || 0),
    failed: Number(d.failed || 0),
    recipients: r.recipients,
    reads: Number(r.reads),
    byChannel: byChannel.map((c) => ({ channel: c.channel, sent: Number(c.sent), failed: Number(c.failed) })),
  });
}));

export default router;
