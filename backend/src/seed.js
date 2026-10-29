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

// Catalogue de templates prêts à l'emploi : slug utilisé dans le code -> notify({ template: slug })
// {{name}} et {{email}} sont remplis automatiquement pour chaque destinataire.
const templates = [
  ['welcome', 'Bienvenue nouvel utilisateur', 'Bienvenue {{name}} !', 'Bonjour {{name}}, votre compte est prêt. Découvrez la plateforme dès maintenant.', 'success', ['inapp', 'email']],
  ['password_reset', 'Réinitialisation du mot de passe', 'Réinitialisation du mot de passe', 'Bonjour {{name}}, choisissez un nouveau mot de passe via ce lien : {{link}} (valable {{minutes}} minutes).', 'warning', ['email']],
  ['security_alert', 'Alerte de sécurité', 'Nouvelle connexion détectée', 'Bonjour {{name}}, une connexion a eu lieu depuis {{device}} ({{location}}). Si ce n’est pas vous, changez votre mot de passe.', 'alert', ['inapp', 'email', 'push']],
  ['order_confirmed', 'Commande confirmée', 'Commande {{order_id}} confirmée', 'Merci {{name}} ! Votre commande {{order_id}} d’un montant de {{amount}} a bien été enregistrée.', 'success', ['inapp', 'email']],
  ['payment_failed', 'Paiement échoué', 'Échec du paiement', 'Bonjour {{name}}, le paiement de {{amount}} pour la commande {{order_id}} a échoué. Réessayez ici : {{link}}', 'alert', ['inapp', 'email']],
  ['invoice_ready', 'Facture disponible', 'Facture {{invoice_id}} disponible', 'Bonjour {{name}}, votre facture {{invoice_id}} de {{amount}} est disponible : {{link}}', 'info', ['inapp', 'email']],
  ['task_assigned', 'Tâche assignée', 'Nouvelle tâche assignée', '{{assigned_by}} vous a assigné la tâche « {{task}} » (échéance : {{due_date}}).', 'info', ['inapp', 'push']],
  ['new_comment', 'Nouveau commentaire', 'Nouveau commentaire', '{{author}} a commenté « {{item}} ».', 'info', ['inapp']],
  ['maintenance', 'Maintenance planifiée', 'Maintenance programmée', 'Bonjour {{name}}, une maintenance aura lieu le {{date}} à {{time}}. Le service sera indisponible environ {{duration}}.', 'warning', ['inapp', 'email']],
  ['promo', 'Offre promotionnelle', 'Offre spéciale : {{offer}}', 'Bonjour {{name}}, profitez de {{offer}} jusqu’au {{end_date}}.', 'info', ['inapp', 'email', 'push']],
];
for (const [slug, name, subject, body, type, channels] of templates) {
  await pool.query(
    'INSERT IGNORE INTO templates (slug, name, subject, body, type, channels) VALUES (?,?,?,?,?,?)',
    [slug, name, subject, body, type, JSON.stringify(channels)]
  );
}
console.log(`Seed terminé (${templates.length} templates) : admin@demo.com / Admin123!  et  user@demo.com / User123!`);
await pool.end();
