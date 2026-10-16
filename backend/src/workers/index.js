import { Worker } from 'bullmq';
import { pool } from '../config/db.js';
import { connection, queues, jobOptions } from '../queue.js';
import { emitToUser } from '../socket.js';
import { sendEmail } from '../services/mailer.js';
import { sendPush } from '../services/push.js';
import { render } from '../utils/render.js';

const parseJson = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

async function log(notificationId, userId, channel, status, error = null) {
  await pool.query(
    'INSERT INTO delivery_logs (notification_id, user_id, channel, status, error) VALUES (?,?,?,?,?)',
    [notificationId, userId, channel, status, error ? String(error).slice(0, 500) : null]
  );
}

async function loadContext(notificationId, userId) {
  const [[n]] = await pool.query('SELECT * FROM notifications WHERE id = ?', [notificationId]);
  const [[u]] = await pool.query('SELECT id, name, email FROM users WHERE id = ?', [userId]);
  if (!n || !u) return null;
  const vars = { name: u.name, email: u.email };
  return {
    user: u,
    payload: {
      id: n.id,
      type: n.type,
      title: render(n.title, vars),
      body: render(n.body, vars),
      created_at: n.created_at,
    },
  };
}

// Un worker par canal : un email lent ne bloque jamais le temps réel.
function channelWorker(channel, handler) {
  const worker = new Worker(
    channel,
    async (job) => {
      const ctx = await loadContext(job.data.notificationId, job.data.userId);
      if (!ctx) return;
      await handler(ctx);
      await log(job.data.notificationId, job.data.userId, channel, 'sent');
    },
    { connection, concurrency: 5 }
  );
  // On ne journalise l'échec qu'une fois les tentatives épuisées
  worker.on('failed', async (job, err) => {
    if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
      await log(job.data.notificationId, job.data.userId, channel, 'failed', err.message).catch(console.error);
    }
  });
  return worker;
}

export function startWorkers() {
  // 1) Dispatcher : résout les destinataires et crée un job par (utilisateur, canal)
  new Worker(
    'dispatch',
    async (job) => {
      const { notificationId } = job.data;
      const [[n]] = await pool.query('SELECT * FROM notifications WHERE id = ?', [notificationId]);
      if (!n) return;
      await pool.query("UPDATE notifications SET status = 'processing' WHERE id = ?", [notificationId]);

      const [users] =
        n.target_type === 'all'
          ? await pool.query('SELECT id FROM users')
          : await pool.query('SELECT id FROM users WHERE id = ?', [n.target_user_id]);
      const channels = parseJson(n.channels);

      for (const u of users) {
        await pool.query('INSERT IGNORE INTO notification_user (notification_id, user_id) VALUES (?,?)', [notificationId, u.id]);
        const [prefs] = await pool.query('SELECT channel, enabled FROM preferences WHERE user_id = ?', [u.id]);
        const disabled = new Set(prefs.filter((p) => !p.enabled).map((p) => p.channel));
        for (const ch of channels) {
          if (!disabled.has(ch)) await queues[ch].add(ch, { notificationId, userId: u.id }, jobOptions);
        }
      }
      await pool.query("UPDATE notifications SET status = 'sent' WHERE id = ?", [notificationId]);
    },
    { connection }
  );

  // 2) Workers de canaux
  channelWorker('inapp', async ({ user, payload }) => emitToUser(user.id, 'notification', payload));
  channelWorker('email', async ({ user, payload }) =>
    sendEmail({ to: user.email, subject: payload.title, text: payload.body })
  );
  channelWorker('push', async ({ user, payload }) =>
    sendPush(user.id, { title: payload.title, body: payload.body })
  );

  console.log('Workers démarrés : dispatch, inapp, email, push');
}
