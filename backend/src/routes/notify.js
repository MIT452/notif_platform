import { Router } from 'express';
import { z } from 'zod';
import { requireApiKey } from '../middleware/auth.js';
import { wrap } from '../middleware/error.js';
import { notify } from '../services/notify.js';

// API pour les AUTRES applications : POST /api/notify  (en-tête X-API-Key)
const router = Router();

const schema = z.object({
  template: z.string().regex(/^[a-z0-9_-]{2,100}$/).optional(),
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).optional(),
  type: z.enum(['info', 'success', 'warning', 'alert']).optional(),
  to: z.union([z.number().int(), z.string(), z.array(z.union([z.number().int(), z.string()])).min(1).max(500)]).default('all'),
  vars: z.record(z.union([z.string(), z.number()])).default({}),
  channels: z.array(z.enum(['inapp', 'email', 'push'])).min(1).optional(),
  scheduledAt: z.string().datetime().optional(),
});

router.post('/', requireApiKey, wrap(async (req, res) => {
  const data = schema.parse(req.body);
  if (!data.template && !(data.title && data.body)) {
    return res.status(400).json({ error: 'Fournir "template" ou "title" + "body"' });
  }
  const result = await notify(data);
  res.status(202).json(result); // 202 : accepté, l'envoi se fait en arrière-plan
}));

export default router;
