import { pool } from '../config/db.js';
import { queues, jobOptions } from '../queue.js';
import { renderKnown } from '../utils/render.js';

const CHANNELS = ['inapp', 'email', 'push'];
const TYPES = ['info', 'success', 'warning', 'alert'];

export class NotifyError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const parseJson = (v) => {
  if (v == null) return null;
  try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return null; }
};

async function firstAdminId() {
  const [[admin]] = await pool.query("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1");
  if (!admin) throw new NotifyError('Aucun administrateur en base (lancer npm run seed)', 500);
  return admin.id;
}

// "to" peut être : 'all' | un id utilisateur | un email
async function resolveRecipient(to) {
  if (to === 'all' || to === undefined || to === null) return { targetType: 'all', targetUserId: null };
  const isId = typeof to === 'number' || /^\d+$/.test(String(to));
  const [[user]] = isId
    ? await pool.query('SELECT id FROM users WHERE id = ?', [Number(to)])
    : await pool.query('SELECT id FROM users WHERE email = ?', [String(to)]);
  if (!user) throw new NotifyError(`Destinataire introuvable : ${to}`, 404);
  return { targetType: 'user', targetUserId: user.id };
}

/**
 * Crée une notification en base et la met en file d'attente (BullMQ).
 * Utilisé par l'API admin (POST /notifications) et par notify().
 */
export async function createNotification(data, createdBy) {
  const vars = data.vars || {};
  let tpl = null;

  if (data.templateSlug || data.templateId) {
    const [[row]] = data.templateSlug
      ? await pool.query('SELECT * FROM templates WHERE slug = ?', [data.templateSlug])
      : await pool.query('SELECT * FROM templates WHERE id = ?', [data.templateId]);
    if (!row) throw new NotifyError(`Template introuvable : ${data.templateSlug || data.templateId}`, 404);
    tpl = row;
  }

  const rawTitle = data.title || tpl?.subject;
  const rawBody = data.body || tpl?.body;
  if (!rawTitle || !rawBody) throw new NotifyError('Titre et message requis (ou un template)');

  const type = data.type || tpl?.type || 'info';
  const channels = (data.channels || parseJson(tpl?.channels) || ['inapp']).filter((c) => CHANNELS.includes(c));
  if (!TYPES.includes(type)) throw new NotifyError('Type invalide');
  if (channels.length === 0) throw new NotifyError('Au moins un canal valide est requis');

  const targetType = data.targetType || 'all';
  if (targetType === 'user') {
    if (!data.targetUserId) throw new NotifyError('targetUserId requis pour un ciblage utilisateur');
    const [[u]] = await pool.query('SELECT id FROM users WHERE id = ?', [data.targetUserId]);
    if (!u) throw new NotifyError('Utilisateur cible introuvable', 404);
  }

  // Les variables fournies sont remplies maintenant ; {{name}} / {{email}} le seront par destinataire.
  const title = renderKnown(rawTitle, vars);
  const body = renderKnown(rawBody, vars);

  const scheduled = data.scheduledAt ? new Date(data.scheduledAt) : null;
  const delay = scheduled ? Math.max(scheduled.getTime() - Date.now(), 0) : 0;
  const status = delay > 0 ? 'scheduled' : 'processing';

  const [r] = await pool.query(
    `INSERT INTO notifications (title, body, type, template_id, target_type, target_user_id, channels, scheduled_at, status, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [title, body, type, tpl?.id || null, targetType, data.targetUserId || null,
     JSON.stringify(channels), scheduled, status, createdBy]
  );
  await queues.dispatch.add('dispatch', { notificationId: r.insertId }, { ...jobOptions, delay });
  return { id: r.insertId, status };
}

/**
 * Point d'entrée "code" : envoyer une notification à partir d'un template en une ligne.
 *
 *   await notify({ template: 'order_confirmed', to: user.id, vars: { order_id: 'A-1024', amount: '49 €' } });
 *
 * @param {object}  opts
 * @param {string}  [opts.template]   slug du template (ex. 'welcome')
 * @param {'all'|number|string|Array} [opts.to='all']  'all', un id, un email, ou un tableau d'ids/emails
 * @param {object}  [opts.vars]       variables du template ({{order_id}} ...)
 * @param {string[]} [opts.channels]  surcharge les canaux par défaut du template
 * @param {string}  [opts.type]       info | success | warning | alert
 * @param {string}  [opts.title]      titre libre (sans template)
 * @param {string}  [opts.body]       message libre (sans template)
 * @param {string}  [opts.scheduledAt] date ISO 8601 pour planifier l'envoi
 */
export async function notify({ template, to = 'all', vars = {}, channels, type, title, body, scheduledAt, createdBy } = {}) {
  if (Array.isArray(to)) {
    return Promise.all(to.map((one) => notify({ template, to: one, vars, channels, type, title, body, scheduledAt, createdBy })));
  }
  const recipient = await resolveRecipient(to);
  const author = createdBy ?? (await firstAdminId());
  return createNotification(
    { templateSlug: template, title, body, type, vars, channels, scheduledAt, ...recipient },
    author
  );
}
