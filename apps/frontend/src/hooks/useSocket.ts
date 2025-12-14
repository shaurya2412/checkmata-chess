import { useEffect, useState } from 'react';
import { useUser } from '@repo/store/useUser';

const WS_URL = import.meta.env.VITE_APP_WS_URL ?? 'ws://localhost:8080';

export const useSocket = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const user = useUser();

  useEffect(() => {
    if (!user) {
      console.log('useSocket: No user, skipping socket connection');
      return;
    }
    console.log('useSocket: Creating WebSocket connection to:', WS_URL);
    const ws = new WebSocket(`${WS_URL}?token=${user.token}`);

    ws.onopen = () => {
      console.log('WebSocket connected successfully, readyState:', ws.readyState);
      setSocket(ws);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      setSocket(null);
    };

    return () => {
      console.log('useSocket cleanup: closing WebSocket');
      ws.close();
    };
  }, [user]);

  return socket;
};
