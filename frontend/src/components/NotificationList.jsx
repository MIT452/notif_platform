export default function NotificationList({ items, markRead, markAllRead }) {
  return (
    <div className="card">
      <div className="row">
        <h2>Mes notifications</h2>
        <button onClick={markAllRead}>Tout marquer comme lu</button>
      </div>
      {items.length === 0 && <p className="muted">Rien pour le moment.</p>}
      {items.map((n) => (
        <div key={n.id} className={`item ${n.type} ${n.is_read ? '' : 'unread'}`}>
          <div className="row">
            <b>{n.title}</b>
            <small>{new Date(n.created_at.replace(' ', 'T')).toLocaleString('fr-FR')}</small>
          </div>
          <span>{n.body}</span>
          {!n.is_read && <button className="link" onClick={() => markRead(n.id)}>Marquer comme lu</button>}
        </div>
      ))}
    </div>
  );
}
