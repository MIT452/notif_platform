import { useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';
import { useNotifications } from './useNotifications.js';
import Login from './components/Login.jsx';
import NotificationBell from './components/NotificationBell.jsx';
import NotificationList from './components/NotificationList.jsx';
import Preferences from './components/Preferences.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';

function Main({ user, onLogout }) {
  const [tab, setTab] = useState('notifications');
  const notif = useNotifications();

  return (
    <>
      <header>
        <strong>Notif Platform</strong>
        <nav>
          <button className={tab === 'notifications' ? 'active' : ''} onClick={() => setTab('notifications')}>Notifications</button>
          <button className={tab === 'prefs' ? 'active' : ''} onClick={() => setTab('prefs')}>Préférences</button>
          {user.role === 'admin' && (
            <button className={tab === 'admin' ? 'active' : ''} onClick={() => setTab('admin')}>Admin</button>
          )}
        </nav>
        <NotificationBell {...notif} />
        <button className="link" onClick={onLogout}>Déconnexion ({user.name})</button>
      </header>
      <main>
        {tab === 'notifications' && <NotificationList {...notif} />}
        {tab === 'prefs' && <Preferences />}
        {tab === 'admin' && user.role === 'admin' && <AdminDashboard />}
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

  if (!ready) return <p style={{ padding: 20 }}>Chargement…</p>;
  return user ? <Main user={user} onLogout={logout} /> : <Login onLogin={setUser} />;
}
