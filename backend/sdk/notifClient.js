// Mini client (zéro dépendance, Node 18+) pour envoyer des notifications depuis n'importe quelle autre application.
//
//   import { createNotifClient } from './notifClient.js';
//   const notif = createNotifClient({ baseUrl: 'http://localhost:4000', apiKey: process.env.NOTIFY_API_KEY });
//   await notif.send('order_confirmed', { to: 12, vars: { order_id: 'A-1024', amount: '49 €' } });

export function createNotifClient({ baseUrl = 'http://localhost:4000', apiKey } = {}) {
  if (!apiKey) throw new Error('apiKey requise (NOTIFY_API_KEY)');

  async function request(payload) {
    const res = await fetch(`${baseUrl}/api/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  return {
    // Envoi à partir d'un template : to = 'all' | id | email | [ids/emails]
    send: (template, { to = 'all', vars, channels, scheduledAt } = {}) =>
      request({ template, to, vars, channels, scheduledAt }),
    // Envoi libre, sans template
    sendRaw: (payload) => request(payload),
  };
}
