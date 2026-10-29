// Utilisation depuis UNE AUTRE application via l'API HTTP :
//   NOTIFY_API_KEY=xxxx node examples/send-via-api.js
import { createNotifClient } from '../sdk/notifClient.js';

const notif = createNotifClient({
  baseUrl: process.env.NOTIF_URL || 'http://localhost:4000',
  apiKey: process.env.NOTIFY_API_KEY,
});

console.log(await notif.send('security_alert', {
  to: 'user@demo.com',
  vars: { device: 'Chrome / Windows', location: 'Antananarivo' },
}));

console.log(await notif.send('task_assigned', {
  to: [1, 2],
  vars: { assigned_by: 'Marc', task: 'Relire le rapport', due_date: 'vendredi' },
  channels: ['inapp', 'push'],
}));
