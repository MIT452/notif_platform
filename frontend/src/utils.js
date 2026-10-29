export const AUTO_VARS = ['name', 'email'];

export const parseDate = (s) => new Date(String(s).replace(' ', 'T'));

export function timeAgo(value) {
  const diff = Math.floor((Date.now() - parseDate(value).getTime()) / 1000);
  if (Number.isNaN(diff)) return '';
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 7 * 86400) return `il y a ${Math.floor(diff / 86400)} j`;
  return parseDate(value).toLocaleDateString('fr-FR');
}

export const fmtDate = (v) => (v ? parseDate(v).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

export const TYPE_LABELS = { info: 'Info', success: 'Succès', warning: 'Avertissement', alert: 'Alerte' };
export const CHANNEL_LABELS = { inapp: 'Appli', email: 'Email', push: 'Push' };
