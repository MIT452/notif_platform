import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpires });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentification requise' });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  next();
}

// Authentification par clé d'API (pour les autres applications / scripts qui envoient des notifications)
export function requireApiKey(req, res, next) {
  if (!env.notifyApiKey) {
    return res.status(503).json({ error: "API externe désactivée : définir NOTIFY_API_KEY dans .env" });
  }
  const given = Buffer.from(String(req.headers['x-api-key'] || ''));
  const expected = Buffer.from(env.notifyApiKey);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return res.status(401).json({ error: "Clé d'API invalide" });
  }
  next();
}
