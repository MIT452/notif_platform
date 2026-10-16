import { useState } from 'react';

export default function NotificationBell({ items, unread, markRead, markAllRead }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bell">
      <button className="bell-btn" onClick={() => setOpen(!open)} aria-label="Notifications">
        🔔{unread > 0 && <span className="badge">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="dropdown card">
          <div className="row">
            <strong>Notifications</strong>
            <button className="link" onClick={markAllRead}>Tout marquer lu</button>
          </div>
          {items.length === 0 && <p className="muted">Aucune notification</p>}
          {items.slice(0, 6).map((n) => (
            <div key={n.id} className={`item ${n.type} ${n.is_read ? '' : 'unread'}`} onClick={() => !n.is_read && markRead(n.id)}>
              <b>{n.title}</b>
              <span>{n.body}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
