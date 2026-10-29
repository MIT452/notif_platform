import { useState } from 'react';
import NotificationItem from './NotificationItem.jsx';
import Icon from './Icon.jsx';

export default function NotificationList({ items, unread, markRead, markAllRead }) {
  const [filter, setFilter] = useState('all');
  const shown = filter === 'unread' ? items.filter((n) => !n.is_read) : items;

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Mes notifications</h2>
          <p className="muted">{unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est à jour'}</p>
        </div>
        <button className="btn soft" onClick={markAllRead} disabled={unread === 0}>
          <Icon name="check" size={16} /> Tout marquer lu
        </button>
      </div>
      <div className="segmented">
        <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>Toutes</button>
        <button className={filter === 'unread' ? 'on' : ''} onClick={() => setFilter('unread')}>Non lues</button>
      </div>
      <div className="notif-list">
        {shown.length === 0 && (
          <div className="empty big"><Icon name="inbox" size={36} /><p>Aucune notification ici.</p></div>
        )}
        {shown.map((n) => <NotificationItem key={n.id} n={n} onClick={() => !n.is_read && markRead(n.id)} />)}
      </div>
    </section>
  );
}
