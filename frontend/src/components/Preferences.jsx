import { useEffect, useState } from 'react';
import { api } from '../api.js';

const CHANNELS = [
  { id: 'inapp', label: 'Dans l’application', desc: 'Cloche et liste de notifications, en temps réel.' },
  { id: 'email', label: 'Email', desc: 'Un message envoyé sur votre adresse email.' },
  { id: 'push', label: 'Push navigateur', desc: 'Notification système, même onglet fermé.' },
];

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function Preferences() {
  const [prefs, setPrefs] = useState(null);
  const [msg, setMsg] = useState({ text: '', ok: true });

  useEffect(() => { api('/preferences').then(setPrefs).catch(console.error); }, []);

  const toggle = async (channel) => {
    const enabled = !prefs[channel];
    setPrefs({ ...prefs, [channel]: enabled });
    try {
      await api('/preferences', { method: 'PUT', body: { channel, enabled } });
    } catch {
      setPrefs((p) => ({ ...p, [channel]: !enabled }));
    }
  };

  const enablePush = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Push non supporté par ce navigateur');
      const { publicKey } = await api('/push/public-key');
      if (!publicKey) throw new Error('Clés VAPID non configurées côté serveur');
      if ((await Notification.requestPermission()) !== 'granted') throw new Error('Permission refusée');
      const reg = await navigator.serviceWorker.register('/sw.js');
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await api('/push/subscribe', { method: 'POST', body: sub.toJSON() });
      setMsg({ text: 'Notifications navigateur activées sur cet appareil.', ok: true });
    } catch (err) {
      setMsg({ text: err.message, ok: false });
    }
  };

  if (!prefs) return <p className="muted">Chargement…</p>;
  return (
    <section className="card">
      <div className="card-head"><div><h2>Préférences</h2><p className="muted">Choisissez comment recevoir vos notifications.</p></div></div>
      <div className="pref-list">
        {CHANNELS.map((c) => (
          <label key={c.id} className="pref">
            <div><b>{c.label}</b><span>{c.desc}</span></div>
            <input type="checkbox" className="switch" checked={prefs[c.id]} onChange={() => toggle(c.id)} />
          </label>
        ))}
      </div>
      <button className="btn soft" onClick={enablePush}>Activer le push sur ce navigateur</button>
      {msg.text && <p className={msg.ok ? 'ok-box' : 'alert-box'}>{msg.text}</p>}
    </section>
  );
}
