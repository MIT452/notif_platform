import webpush from 'web-push';
import { env } from '../config/env.js';
import { pool } from '../config/db.js';

export const pushEnabled = Boolean(env.vapid.publicKey && env.vapid.privateKey);
if (pushEnabled) webpush.setVapidDetails(env.vapid.subject, env.vapid.publicKey, env.vapid.privateKey);

export async function sendPush(userId, payload) {
  if (!pushEnabled) throw new Error('Clés VAPID non configurées');
  const [subs] = await pool.query('SELECT * FROM push_subscriptions WHERE user_id = ?', [userId]);
  if (subs.length === 0) throw new Error('Aucun abonnement push pour cet utilisateur');
  let delivered = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload)
      );
      delivered++;
    } catch (err) {
      // 404/410 = abonnement expiré : on le supprime
      if (err.statusCode === 404 || err.statusCode === 410) {
        await pool.query('DELETE FROM push_subscriptions WHERE id = ?', [s.id]);
      } else {
        throw err;
      }
    }
  }
  if (delivered === 0) throw new Error('Tous les abonnements push sont expirés');
}
