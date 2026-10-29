import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from './Icon.jsx';
import { CHANNEL_LABELS, TYPE_LABELS, fmtDate } from '../utils.js';

const empty = { title: '', body: '', type: 'info', targetType: 'all', targetUserId: '', templateId: '', scheduledAt: '', channels: ['inapp'] };

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [list, setList] = useState([]);
  const [users, setUsers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(empty);
  const [vars, setVars] = useState({});
  const [logs, setLogs] = useState(null);
  const [msg, setMsg] = useState({ text: '', ok: true });

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

  const tpl = templates.find((t) => String(t.id) === String(form.templateId));

  // Choisir un template pré-remplit le formulaire et affiche ses variables
  const pickTemplate = (id) => {
    const t = templates.find((x) => String(x.id) === String(id));
    setVars({});
    if (!t) return set('templateId', '');
    setForm((f) => ({ ...f, templateId: t.id, title: t.subject, body: t.body, type: t.type, channels: t.channels }));
  };

  const send = async () => {
    setMsg({ text: '', ok: true });
    const missing = (tpl?.variables || []).filter((v) => !String(vars[v] ?? '').trim());
    if (missing.length) return setMsg({ text: `Variables à renseigner : ${missing.join(', ')}`, ok: false });
    try {
      const body = {
        type: form.type,
        targetType: form.targetType,
        channels: form.channels,
        vars,
        ...(form.title && { title: form.title }),
        ...(form.body && { body: form.body }),
        ...(form.templateId && { templateId: Number(form.templateId) }),
        ...(form.targetType === 'user' && { targetUserId: Number(form.targetUserId) }),
        ...(form.scheduledAt && { scheduledAt: new Date(form.scheduledAt).toISOString() }),
      };
      const r = await api('/notifications', { method: 'POST', body });
      setMsg({ text: r.status === 'scheduled' ? 'Notification planifiée.' : 'Notification envoyée en file d’attente.', ok: true });
      setForm(empty);
      setVars({});
      setTimeout(() => refresh().catch(console.error), 1200);
    } catch (err) {
      setMsg({ text: err.message, ok: false });
    }
  };

  const showLogs = async (id) => setLogs({ id, rows: await api(`/notifications/${id}/logs`) });
  const readRate = stats && stats.recipients ? Math.round((stats.reads / stats.recipients) * 100) : 0;

  return (
    <>
      {stats && (
        <div className="stats">
          <div className="stat"><span className="stat-ico blue"><Icon name="send" /></span><b>{stats.notifications}</b><small>Notifications</small></div>
          <div className="stat"><span className="stat-ico green"><Icon name="check" /></span><b>{stats.delivered}</b><small>Livraisons réussies</small></div>
          <div className="stat"><span className="stat-ico red"><Icon name="alert" /></span><b>{stats.failed}</b><small>Échecs</small></div>
          <div className="stat"><span className="stat-ico amber"><Icon name="inbox" /></span><b>{readRate}%</b><small>Taux de lecture</small></div>
        </div>
      )}

      <section className="card">
        <div className="card-head"><div><h2>Nouvelle notification</h2><p className="muted">Partez d'un template ou écrivez un message libre.</p></div></div>

        <div className="form-grid">
          <label className="field">Template
            <select value={form.templateId} onChange={(e) => pickTemplate(e.target.value)}>
              <option value="">— Message libre —</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="field">Type
            <select value={form.type} onChange={(e) => set('type', e.target.value)}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="field">Destinataires
            <select value={form.targetType} onChange={(e) => set('targetType', e.target.value)}>
              <option value="all">Tous les utilisateurs</option><option value="user">Un utilisateur</option>
            </select>
          </label>
          {form.targetType === 'user' && (
            <label className="field">Utilisateur
              <select value={form.targetUserId} onChange={(e) => set('targetUserId', e.target.value)}>
                <option value="">Choisir…</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </label>
          )}
        </div>

        {tpl?.variables.length > 0 && (
          <div className="vars-box">
            <b>Variables du template</b>
            <div className="form-grid">
              {tpl.variables.map((v) => (
                <label key={v} className="field">{`{{${v}}}`}
                  <input value={vars[v] || ''} onChange={(e) => setVars({ ...vars, [v]: e.target.value })} />
                </label>
              ))}
            </div>
            <small className="muted">{'{{name}}'} et {'{{email}}'} sont remplis automatiquement pour chaque destinataire.</small>
          </div>
        )}

        <label className="field">Titre
          <input placeholder="Titre (vous pouvez utiliser {{name}})" value={form.title} onChange={(e) => set('title', e.target.value)} />
        </label>
        <label className="field">Message
          <textarea rows={3} placeholder="Message" value={form.body} onChange={(e) => set('body', e.target.value)} />
        </label>

        <div className="row wrap">
          <div className="checks">
            {Object.entries(CHANNEL_LABELS).map(([c, label]) => (
              <label key={c} className={`check ${form.channels.includes(c) ? 'on' : ''}`}>
                <input type="checkbox" checked={form.channels.includes(c)} onChange={() => toggleChannel(c)} /> {label}
              </label>
            ))}
          </div>
          <label className="field inline">Planifier
            <input type="datetime-local" value={form.scheduledAt} onChange={(e) => set('scheduledAt', e.target.value)} />
          </label>
        </div>

        <div className="row wrap">
          <button className="btn primary" onClick={send}><Icon name="send" size={16} /> Envoyer</button>
          {msg.text && <span className={msg.ok ? 'ok-text' : 'err-text'}>{msg.text}</span>}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Historique</h2>
          <button className="btn soft" onClick={() => refresh()}><Icon name="refresh" size={16} /> Rafraîchir</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Notification</th><th>Statut</th><th>Dest.</th><th>Livrées</th><th>Échecs</th><th>Lues</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {list.map((n) => (
                <tr key={n.id}>
                  <td><span className={`type-dot ${n.type}`} />{n.title}</td>
                  <td><span className={`status ${n.status}`}>{n.status}</span></td>
                  <td>{n.recipients}</td><td>{n.delivered}</td><td>{n.failed}</td><td>{n.reads}</td>
                  <td>{fmtDate(n.created_at)}</td>
                  <td><button className="link" onClick={() => showLogs(n.id)}>Logs</button></td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={8} className="muted">Aucune notification envoyée.</td></tr>}
            </tbody>
          </table>
        </div>
        {logs && (
          <div className="logs">
            <b>Journal de livraison #{logs.id}</b>
            {logs.rows.length === 0 && <p className="muted">Aucun log pour le moment.</p>}
            {logs.rows.map((l) => (
              <div key={l.id} className={`log ${l.status}`}>
                <span>{l.status === 'sent' ? '✓' : '✕'}</span> {CHANNEL_LABELS[l.channel]} → {l.email}
                {l.error && <em> — {l.error}</em>}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
