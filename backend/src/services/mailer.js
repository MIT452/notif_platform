import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

// Sans SMTP configuré, nodemailer produit juste le JSON du message (affiché en console).
const transporter = env.smtp.host
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true });

export async function sendEmail({ to, subject, text }) {
  const info = await transporter.sendMail({ from: env.smtp.from, to, subject, text });
  if (!env.smtp.host) console.log('[email simulé]', to, '-', subject);
  return info;
}
