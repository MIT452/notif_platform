import { useState } from 'react';
import { api, setToken } from '../api.js';
import Icon from './Icon.jsx';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api(mode === 'login' ? '/auth/login' : '/auth/register', { method: 'POST', body: form });
      setToken(data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const demo = (email, password) => setForm({ name: '', email, password });

  return (
    <div className="auth">
      <div className="auth-hero">
        <div className="logo"><Icon name="bell" size={22} /></div>
        <h1>Notif Platform</h1>
        <p>Envoyez des notifications en temps réel, par email et en push, depuis une seule plateforme.</p>
        <ul>
          <li><Icon name="check" size={16} /> Temps réel (Socket.IO)</li>
          <li><Icon name="check" size={16} /> Templates réutilisables dans le code</li>
          <li><Icon name="check" size={16} /> Suivi de livraison complet</li>
        </ul>
      </div>

      <form className="auth-card" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Connexion' : 'Créer un compte'}</h2>
        {mode === 'register' && (
          <label className="field">Nom<input name="name" value={form.name} onChange={change} required minLength={2} /></label>
        )}
        <label className="field">Email<input name="email" type="email" value={form.email} onChange={change} required /></label>
        <label className="field">Mot de passe<input name="password" type="password" value={form.password} onChange={change} required minLength={mode === 'register' ? 8 : 1} /></label>
        {error && <p className="alert-box">{error}</p>}
        <button className="btn primary block" disabled={busy}>{busy ? '…' : mode === 'login' ? 'Se connecter' : "S'inscrire"}</button>
        <button type="button" className="btn ghost block" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          {mode === 'login' ? 'Créer un compte' : "J'ai déjà un compte"}
        </button>
        {mode === 'login' && (
          <div className="demo">
            <span>Comptes de démo :</span>
            <button type="button" className="chip-btn" onClick={() => demo('admin@demo.com', 'Admin123!')}>Admin</button>
            <button type="button" className="chip-btn" onClick={() => demo('user@demo.com', 'User123!')}>Utilisateur</button>
          </div>
        )}
      </form>
    </div>
  );
}
