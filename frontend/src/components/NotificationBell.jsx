import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import NotificationItem from './NotificationItem.jsx';

export default function NotificationBell({ items, unread, markRead, markAllRead, onSeeAll }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Ferme le panneau au clic à l'extérieur
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="bell" ref={ref}>
      <button className="icon-btn" onClick={() => setOpen(!open)} aria-label="Notifications">
        <Icon name="bell" size={20} />
        {unread > 0 && <span className="badge">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="popover">
          <div className="popover-head">
            <strong>Notifications</strong>
            <button className="link" onClick={markAllRead}>Tout marquer lu</button>
          </div>
          <div className="popover-list">
            {items.length === 0 && <p className="empty">Aucune notification</p>}
            {items.slice(0, 6).map((n) => (
              <NotificationItem key={n.id} n={n} onClick={() => !n.is_read && markRead(n.id)} />
            ))}
          </div>
          <button className="popover-foot" onClick={() => { setOpen(false); onSeeAll(); }}>Voir tout</button>
        </div>
      )}
    </div>
  );
}
