import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from './Icon.jsx';
import { CHANNEL_LABELS, TYPE_LABELS } from '../utils.js';

const blank = { slug: '', name: '', subject: '', body: '', type: 'info', channels: ['inapp'] };

function Highlight({ text }) {
  return String(text).split(/(\{\{\s*\w+\s*\}\})/g).map((p, i) =>
    /^\{\{/.test(p) ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>
  );
}

const codeSnippet = (t) => {
  const vars = t.variables.length ? `\n  vars: { ${t.variables.map((v) => `${v}: '...'`).join(', ')} },` : '';
  return `import { notify } from './services/notify.js';\n\nawait notify({\n  template: '${t.slug}',\n  to: userId, // id, email, 'all' ou tableau${vars}\n});`;
};

const curlSnippet = (t) => {
  const vars = Object.fromEntries(t.variables.map((v) => [v, '...']));
  const payload = JSON.stringify({ template: t.slug, to: 'user@demo.com', ...(t.variables.length && { vars }) });
  return `curl -X POST http://localhost:4000/api/notify \\\n  -H "X-API-Key: $NOTIFY_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${payload}'`;
};

function CodeBlock({ label, code }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };
  return (
    <div className="code">
      <div className="code-head"><span>{label}</span><button className="link" onClick={copy}><Icon name="copy" size={14} /> {copied ? 'Copié' : 'Copier'}</button></div>
      <pre>{code}</pre>
    </div>
  );
}

export default function TemplatesManager({ user }) {
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(null); // null = fermé
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState({ text: '', ok: true });

  const load = useCallback(() => api('/templates').then(setTemplates).catch(console.error), []);
  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleChannel = (c) =>
    set('channels', form.channels.includes(c) ? form.channels.filter((x) => x !== c) : [...form.channels, c]);

  const open = (t) => {
    setMsg({ text: '', ok: true });
    setEditingId(t ? t.id : null);
    setForm(t ? { slug: t.slug, name: t.name, subject: t.subject, body: t.body, type: t.type, channels: t.channels } : blank);
  };

  const save = async () => {
    try {
      await api(editingId ? `/templates/${editingId}` : '/templates', { method: editingId ? 'PUT' : 'POST', body: form });
      setForm(null);
      setEditingId(null);
      load();
    } catch (err) {
      setMsg({ text: err.message, ok: false });
    }
  };

  const remove = async (t) => {
    if (!window.confirm(`Supprimer le template « ${t.name} » ?`)) return;
    await api(`/templates/${t.id}`, { method: 'DELETE' });
    load();
  };

  // Envoie le template à l'utilisateur connecté, avec des valeurs d'exemple
  const test = async (t) => {
    try {
      const vars = Object.fromEntries(t.variables.map((v) => [v, `exemple_${v}`]));
      await api('/notifications', { method: 'POST', body: { templateId: t.id, targetType: 'user', targetUserId: user.id, vars } });
      setMsg({ text: `Test « ${t.name} » envoyé : regardez la cloche.`, ok: true });
    } catch (err) {
      setMsg({ text: err.message, ok: false });
    }
  };

  return (
    <>
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Templates de notification</h2>
            <p className="muted">Chaque template a un <code>slug</code> à utiliser dans le code : <code>notify({'{ template: \'welcome\' }'})</code>.</p>
          </div>
          <button className="btn primary" onClick={() => open(null)}><Icon name="plus" size={16} /> Nouveau</button>
        </div>
        {msg.text && !form && <p className={msg.ok ? 'ok-box' : 'alert-box'}>{msg.text}</p>}

        {form && (
          <div className="editor">
            <h3>{editingId ? 'Modifier le template' : 'Nouveau template'}</h3>
            <div className="form-grid">
              <label className="field">Slug (utilisé dans le code)
                <input placeholder="order_confirmed" value={form.slug} onChange={(e) => set('slug', e.target.value.toLowerCase())} />
              </label>
              <label className="field">Nom
                <input placeholder="Commande confirmée" value={form.name} onChange={(e) => set('name', e.target.value)} />
              </label>
              <label className="field">Type
                <select value={form.type} onChange={(e) => set('type', e.target.value)}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
            </div>
            <label className="field">Titre
              <input placeholder="Commande {{order_id}} confirmée" value={form.subject} onChange={(e) => set('subject', e.target.value)} />
            </label>
            <label className="field">Message
              <textarea rows={3} placeholder="Merci {{name}} ! Votre commande {{order_id}} est confirmée." value={form.body} onChange={(e) => set('body', e.target.value)} />
            </label>
            <div className="checks">
              {Object.entries(CHANNEL_LABELS).map(([c, label]) => (
                <label key={c} className={`check ${form.channels.includes(c) ? 'on' : ''}`}>
                  <input type="checkbox" checked={form.channels.includes(c)} onChange={() => toggleChannel(c)} /> {label}
                </label>
              ))}
            </div>
            <small className="muted">Utilisez {'{{variable}}'} pour les valeurs dynamiques. {'{{name}}'} et {'{{email}}'} sont automatiques.</small>
            {msg.text && <p className={msg.ok ? 'ok-box' : 'alert-box'}>{msg.text}</p>}
            <div className="row">
              <button className="btn primary" onClick={save}>Enregistrer</button>
              <button className="btn ghost" onClick={() => setForm(null)}>Annuler</button>
            </div>
          </div>
        )}
      </section>

      <div className="tpl-grid">
        {templates.map((t) => (
          <article key={t.id} className="card tpl">
            <div className="tpl-top">
              <span className={`badge-type ${t.type}`}>{TYPE_LABELS[t.type]}</span>
              <code className="slug">{t.slug}</code>
            </div>
            <h3>{t.name}</h3>
            <p className="tpl-subject"><Highlight text={t.subject} /></p>
            <p className="tpl-body"><Highlight text={t.body} /></p>
            <div className="chips">
              {t.channels.map((c) => <span key={c} className="chip">{CHANNEL_LABELS[c]}</span>)}
              {t.variables.map((v) => <span key={v} className="chip var">{v}</span>)}
            </div>
            <details>
              <summary><Icon name="code" size={14} /> Utiliser dans le code</summary>
              <CodeBlock label="Node.js (backend)" code={codeSnippet(t)} />
              <CodeBlock label="API HTTP (autre application)" code={curlSnippet(t)} />
            </details>
            <div className="row tpl-actions">
              <button className="btn soft" onClick={() => test(t)}><Icon name="send" size={14} /> Tester sur moi</button>
              <button className="btn ghost" onClick={() => open(t)}>Modifier</button>
              <button className="icon-btn danger" onClick={() => remove(t)} aria-label="Supprimer"><Icon name="trash" size={16} /></button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
