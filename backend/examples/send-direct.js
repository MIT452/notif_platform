// Utilisation DANS le code du backend (même projet) :  node examples/send-direct.js
// Le serveur (npm run dev) doit tourner : ses workers traiteront les jobs mis en file.
import { notify } from '../src/services/notify.js';
import { connection } from '../src/queue.js';
import { pool } from '../src/config/db.js';

// 1) Template + un utilisateur (par email) + variables
console.log(await notify({
  template: 'order_confirmed',
  to: 'user@demo.com',
  vars: { order_id: 'A-1024', amount: '49,90 €' },
}));

// 2) Template + tous les utilisateurs + canaux surchargés
console.log(await notify({
  template: 'maintenance',
  to: 'all',
  vars: { date: '25/10', time: '22h00', duration: '30 minutes' },
  channels: ['inapp'],
}));

// 3) Message libre, planifié dans 1 minute
console.log(await notify({
  title: 'Rappel',
  body: 'Bonjour {{name}}, pensez à valider votre profil.',
  to: 'user@demo.com',
  type: 'warning',
  scheduledAt: new Date(Date.now() + 60_000).toISOString(),
}));

await connection.quit();
await pool.end();
