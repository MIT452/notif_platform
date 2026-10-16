import { useState } from 'react';
import { api, setToken } from '../api.js';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: 'user@demo.com', password: 'User123!' });
  const [error, setError] = useState('');

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async () => {
    setError('');
    try {
      const data = await api(mode === 'login' ? '/auth/login' : '/auth/register', { method: 'POST', body: form });
      setToken(data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card login">
      <h1>Notif Platform</h1>
      {mode === 'register' && <input name="name" placeholder="Nom" value={form.name} onChange={change} />}
      <input name="email" placeholder="Email" value={form.email} onChange={change} />
      <input name="password" type="password" placeholder="Mot de passe" value={form.password} onChange={change} />
      {error && <p className="error">{error}</p>}
      <button onClick={submit}>{mode === 'login' ? 'Se connecter' : "S'inscrire"}</button>
      <button className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Créer un compte' : 'J’ai déjà un compte'}
      </button>
    </div>
  );
}
