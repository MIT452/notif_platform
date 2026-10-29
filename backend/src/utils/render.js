// Variables {{name}} / {{email}} : remplies automatiquement pour chaque destinataire.
export const AUTO_VARS = ['name', 'email'];

const VAR_RE = /\{\{\s*(\w+)\s*\}\}/g;

// Remplace toutes les variables ; une variable inconnue devient une chaîne vide.
export function render(text, vars = {}) {
  return String(text ?? '').replace(VAR_RE, (_, key) => (vars[key] !== undefined ? String(vars[key]) : ''));
}

// Remplace uniquement les variables fournies et laisse les autres intactes
// (ex. {{name}} sera rempli plus tard, séparément pour chaque destinataire).
export function renderKnown(text, vars = {}) {
  return String(text ?? '').replace(VAR_RE, (match, key) => (vars[key] !== undefined ? String(vars[key]) : match));
}

// Liste les variables utilisées dans un ou plusieurs textes.
export function extractVars(...texts) {
  const found = new Set();
  for (const t of texts) for (const m of String(t ?? '').matchAll(VAR_RE)) found.add(m[1]);
  return [...found];
}
