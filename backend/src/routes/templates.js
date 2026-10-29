import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { wrap } from '../middleware/error.js';
import { extractVars, AUTO_VARS } from '../utils/render.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const schema = z.object({
  slug: z.string().regex(/^[a-z0-9_-]{2,100}$/, 'slug : minuscules, chiffres, - et _ (2 à 100 caractères)'),
  name: z.string().min(2).max(100),
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
  type: z.enum(['info', 'success', 'warning', 'alert']).default('info'),
  channels: z.array(z.enum(['inapp', 'email', 'push'])).min(1).default(['inapp']),
});

const parseJson = (v) => { try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return null; } };

// Ajoute la liste des variables à fournir (hors {{name}} / {{email}}, remplies automatiquement)
const present = (t) => ({
  ...t,
  channels: parseJson(t.channels) || ['inapp'],
  variables: extractVars(t.subject, t.body).filter((v) => !AUTO_VARS.includes(v)),
});

router.get('/', wrap(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM templates ORDER BY name');
  res.json(rows.map(present));
}));

router.post('/', wrap(async (req, res) => {
  const t = schema.parse(req.body);
  const [r] = await pool.query(
    'INSERT INTO templates (slug, name, subject, body, type, channels) VALUES (?,?,?,?,?,?)',
    [t.slug, t.name, t.subject, t.body, t.type, JSON.stringify(t.channels)]
  );
  res.status(201).json(present({ id: r.insertId, ...t }));
}));

router.put('/:id', wrap(async (req, res) => {
  const t = schema.parse(req.body);
  await pool.query(
    'UPDATE templates SET slug=?, name=?, subject=?, body=?, type=?, channels=? WHERE id=?',
    [t.slug, t.name, t.subject, t.body, t.type, JSON.stringify(t.channels), Number(req.params.id)]
  );
  res.json(present({ id: Number(req.params.id), ...t }));
}));

router.delete('/:id', wrap(async (req, res) => {
  await pool.query('DELETE FROM templates WHERE id = ?', [Number(req.params.id)]);
  res.json({ ok: true });
}));

export default router;
