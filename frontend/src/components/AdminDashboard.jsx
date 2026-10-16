import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

const empty = { title: '', body: '', type: 'info', targetType: 'all', targetUserId: '', templateId: '', scheduledAt: '', channels: ['inapp'] };

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [list, setList] = useState([]);
  const [users, setUsers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(empty);
  const [logs, setLogs] = useState(null);
  const [msg, setMsg] = useState('');

  const refresh = useCallback(async () => {
    const [s, l] = await Promise.all([api('/admin/stats'), api('/notifications')]);
    setStats(s);
    setList(l);
  }, []);

  useEffect(() => {
    refresh().catch(console.error);
    api('/admin/users').then(setUsers).catch(console.error);
    api('/templates').then(setTemplates).catch(console.error);
  }, [refresh]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleChannel = (c) =>
    set('channels', form.channels.includes(c) ? form.channels.filter((x) => x !== c) : [...form.channels, c]);

  const send = async () => {
    setMsg('');
    try {
      const body = {
        type: form.type,
        targetType: form.targetType,
        channels: form.channels,
        ...(form.title && { title: form.title }),
        ...(form.body && { body: form.body }),
        ...(form.templateId && { templateId: Number(form.templateId) }),
        ...(form.targetType === 'user' && { targetUserId: Number(form.targetUserId) }),
        ...(form.scheduledAt && { scheduledAt: new Date(form.scheduledAt).toISOString() }),
      };
      const r = await api('/notifications', { method: 'POST', body });
      setMsg(r.status === 'scheduled' ? 'Notification planifiée ✅' : 'Notification envoyée en file d’attente ✅');
      setForm(empty);
      setTimeout(refresh, 1200);
    } catch (err) {
      setMsg(err.message);
    }
  };

  const showLogs = async (id) => setLogs({ id, rows: await api(`/notifications/${id}/logs`) });

  return (
    <>
      {stats && (
        <div className="stats">
          <div className="card"><b>{stats.notifications}</b><span>Notifications</span></div>
          <div className="card"><b>{stats.delivered}</b><span>Livrées</span></div>
          <div className="card"><b>{stats.failed}</b><span>Échecs</span></div>
          <div className="card"><b>{stats.recipients ? Math.round((stats.reads / stats.recipients) * 100) : 0}%</b><span>Taux de lecture</span></div>
        </div>
      )}

      <div className="card">
        <h2>Nouvelle notification</h2>
        <select value={form.templateId} onChange={(e) => set('templateId', e.target.value)}>
          <option value="">— Sans template —</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input placeholder="Titre (variables : {{name}})" value={form.title} onChange={(e) => set('title', e.target.value)} />
        <textarea placeholder="Message" rows={3} value={form.body} onChange={(e) => set('body', e.target.value)} />
        <div className="row">
          <select value={form.type} onChange={(e) => set('type', e.target.value)}>
            <option value="info">Info</option><option value="success">Succès</option>
            <option value="warning">Avertissement</option><option value="alert">Alerte</option>
          </select>
          <select value={form.targetType} onChange={(e) => set('targetType', e.target.value)}>
            <option value="all">Tous les utilisateurs</option><option value="user">Un utilisateur</option>
          </select>
          {form.targetType === 'user' && (
            <select value={form.targetUserId} onChange={(e) => set('targetUserId', e.target.value)}>
              <option value="">Choisir…</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          )}
        </div>
        <div className="row">
          {['inapp', 'email', 'push'].map((c) => (
            <label key={c}><input type="checkbox" checked={form.channels.includes(c)} onChange={() => toggleChannel(c)} /> {c}</label>
          ))}
        </div>
        <label>Planifier (optionnel) <input type="datetime-local" value={form.scheduledAt} onChange={(e) => set('scheduledAt', e.target.value)} /></label>
        <button onClick={send}>Envoyer</button>
        {msg && <p className="muted">{msg}</p>}
      </div>

      <div className="card">
        <div className="row"><h2>Historique</h2><button className="link" onClick={refresh}>Rafraîchir</button></div>
        <table>
          <thead><tr><th>Titre</th><th>Statut</th><th>Destin.</th><th>Livrées</th><th>Échecs</th><th>Lues</th><th></th></tr></thead>
          <tbody>
            {list.map((n) => (
              <tr key={n.id}>
                <td>{n.title}</td><td>{n.status}</td><td>{n.recipients}</td>
                <td>{n.delivered}</td><td>{n.failed}</td><td>{n.reads}</td>
                <td><button className="link" onClick={() => showLogs(n.id)}>Logs</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs && (
          <div className="logs">
            <b>Journal de livraison #{logs.id}</b>
            {logs.rows.length === 0 && <p className="muted">Aucun log.</p>}
            {logs.rows.map((l) => (
              <div key={l.id}>{l.status === 'sent' ? '✅' : '❌'} {l.channel} → {l.email} {l.error && <em>({l.error})</em>}</div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
