import { ZodError } from 'zod';

// Enveloppe les handlers async pour transmettre les erreurs au middleware d'erreurs.
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function notFound(req, res) {
  res.status(404).json({ error: 'Route introuvable' });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Données invalides', details: err.errors.map((e) => `${e.path.join('.')}: ${e.message}`) });
  }
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Valeur déjà existante' });
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
}
