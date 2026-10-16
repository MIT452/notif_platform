import bcrypt from 'bcryptjs';
import { pool } from './config/db.js';

const users = [
  ['Admin', 'admin@demo.com', 'Admin123!', 'admin'],
  ['Alice Demo', 'user@demo.com', 'User123!', 'user'],
];
for (const [name, email, pwd, role] of users) {
  await pool.query(
    'INSERT IGNORE INTO users (name, email, password_hash, role) VALUES (?,?,?,?)',
    [name, email, await bcrypt.hash(pwd, 10), role]
  );
}
await pool.query(
  'INSERT IGNORE INTO templates (name, subject, body) VALUES (?,?,?), (?,?,?)',
  ['bienvenue', 'Bienvenue {{name}} !', 'Bonjour {{name}}, votre compte est prêt.',
   'maintenance', 'Maintenance programmée', 'Bonjour {{name}}, une maintenance aura lieu ce soir à 22h.']
);
console.log('Seed terminé : admin@demo.com / Admin123!  et  user@demo.com / User123!');
await pool.end();
