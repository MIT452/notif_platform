import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api, getToken } from './api.js';

// Charge les notifications et écoute les nouvelles en temps réel (Socket.IO)
export function useNotifications() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    const data = await api('/notifications/me?limit=50');
    setItems(data.items);
    setUnread(data.unread);
  }, []);

  useEffect(() => {
    load().catch(console.error);
    const socket = io({ auth: { token: getToken() } });
    socket.on('notification', (n) => {
      setItems((prev) => (prev.some((p) => p.id === n.id) ? prev : [{ ...n, is_read: false }, ...prev]));
      setUnread((u) => u + 1);
    });
    return () => socket.disconnect();
  }, [load]);

  const markRead = async (id) => {
    await api(`/notifications/${id}/read`, { method: 'PATCH' });
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_read: true } : i)));
    setUnread((u) => Math.max(u - 1, 0));
  };

  const markAllRead = async () => {
    await api('/notifications/me/read-all', { method: 'PATCH' });
    setItems((prev) => prev.map((i) => ({ ...i, is_read: true })));
    setUnread(0);
  };

  return { items, unread, markRead, markAllRead };
}
