import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { wrap } from '../middleware/error.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const schema = z.object({ name: z.string().min(2).max(100), subject: z.string().min(1).max(200), body: z.string().min(1) });

router.get('/', wrap(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM templates ORDER BY name');
  res.json(rows);
}));

router.post('/', wrap(async (req, res) => {
  const t = schema.parse(req.body);
  const [r] = await pool.query('INSERT INTO templates (name, subject, body) VALUES (?,?,?)', [t.name, t.subject, t.body]);
  res.status(201).json({ id: r.insertId, ...t });
}));

router.delete('/:id', wrap(async (req, res) => {
  await pool.query('DELETE FROM templates WHERE id = ?', [Number(req.params.id)]);
  res.json({ ok: true });
}));

export default router;
