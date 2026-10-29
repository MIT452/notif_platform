import Icon from './Icon.jsx';
import { timeAgo } from '../utils.js';

export default function NotificationItem({ n, onClick }) {
  return (
    <div className={`notif ${n.type} ${n.is_read ? '' : 'unread'}`} onClick={onClick} role="button" tabIndex={0}
         onKeyDown={(e) => e.key === 'Enter' && onClick?.()}>
      <span className="notif-icon"><Icon name={n.type} size={18} /></span>
      <div className="notif-main">
        <div className="notif-title">{n.title}</div>
        <div className="notif-body">{n.body}</div>
        <div className="notif-time">{timeAgo(n.created_at)}</div>
      </div>
      {!n.is_read && <span className="dot" title="Non lue" />}
    </div>
  );
}
