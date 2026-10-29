import { useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';
import { useNotifications } from './useNotifications.js';
import Login from './components/Login.jsx';
import Icon from './components/Icon.jsx';
import NotificationBell from './components/NotificationBell.jsx';
import NotificationList from './components/NotificationList.jsx';
import Preferences from './components/Preferences.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import TemplatesManager from './components/TemplatesManager.jsx';

function Main({ user, onLogout }) {
  const [tab, setTab] = useState('notifications');
  const notif = useNotifications();

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: 'inbox', count: notif.unread },
    { id: 'prefs', label: 'Préférences', icon: 'settings' },
    ...(user.role === 'admin'
      ? [{ id: 'admin', label: 'Envoi', icon: 'send' }, { id: 'templates', label: 'Templates', icon: 'layers' }]
      : []),
  ];

  return (
    <>
      <header className="topbar">
        <div className="brand"><span className="logo sm"><Icon name="bell" size={16} /></span><strong>Notif Platform</strong></div>

        <nav className="tabs">
          {tabs.map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
              <Icon name={t.icon} size={18} /><span>{t.label}</span>
              {t.count > 0 && <em className="tab-count">{t.count > 99 ? '99+' : t.count}</em>}
            </button>
          ))}
        </nav>

        <div className="top-right">
          <NotificationBell {...notif} onSeeAll={() => setTab('notifications')} />
          <div className="user">
            <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
            <span className="user-name">{user.name}</span>
          </div>
          <button className="icon-btn" onClick={onLogout} aria-label="Déconnexion" title="Déconnexion"><Icon name="logout" size={18} /></button>
        </div>
      </header>

      {notif.toast && (
        <div className={`toast ${notif.toast.type}`} onClick={notif.dismissToast} role="status">
          <span className="notif-icon"><Icon name={notif.toast.type} size={18} /></span>
          <div><b>{notif.toast.title}</b><span>{notif.toast.body}</span></div>
        </div>
      )}

      <main>
        {tab === 'notifications' && <NotificationList {...notif} />}
        {tab === 'prefs' && <Preferences />}
        {tab === 'admin' && user.role === 'admin' && <AdminDashboard />}
        {tab === 'templates' && user.role === 'admin' && <TemplatesManager user={user} />}
      </main>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);

  const logout = () => { setToken(null); setUser(null); };

  if (!ready) return <p className="muted" style={{ padding: 24 }}>Chargement…</p>;
  return user ? <Main user={user} onLogout={logout} /> : <Login onLogin={setUser} />;
}
