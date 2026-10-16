import { useEffect, useState } from 'react';
import { api } from '../api.js';

const LABELS = { inapp: 'Dans l’application', email: 'Email', push: 'Push navigateur' };

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function Preferences() {
  const [prefs, setPrefs] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => { api('/preferences').then(setPrefs).catch(console.error); }, []);

  const toggle = async (channel) => {
    const enabled = !prefs[channel];
    await api('/preferences', { method: 'PUT', body: { channel, enabled } });
    setPrefs({ ...prefs, [channel]: enabled });
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
      setMsg('Notifications navigateur activées ✅');
    } catch (err) {
      setMsg(err.message);
    }
  };

  if (!prefs) return <p>Chargement…</p>;
  return (
    <div className="card">
      <h2>Préférences de notification</h2>
      {Object.keys(LABELS).map((c) => (
        <label key={c} className="switch">
          <input type="checkbox" checked={prefs[c]} onChange={() => toggle(c)} /> {LABELS[c]}
        </label>
      ))}
      <button onClick={enablePush}>Activer le push sur ce navigateur</button>
      {msg && <p className="muted">{msg}</p>}
    </div>
  );
}
