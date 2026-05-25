import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '../services/socket';

export function useSocket() {
  const token = localStorage.getItem('client_token') || '';
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const onConnect = useCallback(() => setIsConnected(true), []);
  const onDisconnect = useCallback(() => setIsConnected(false), []);

  useEffect(() => {
    if (!token) return;

    const nextSocket = getSocket(token);
    setSocket(nextSocket);

    nextSocket.on('connect', onConnect);
    nextSocket.on('disconnect', onDisconnect);

    requestAnimationFrame(() => {
      if (nextSocket.connected) setIsConnected(true);
    });

    return () => {
      nextSocket.off('connect', onConnect);
      nextSocket.off('disconnect', onDisconnect);
      setSocket(null);
    };
  }, [token, onConnect, onDisconnect]);

  return { socket, isConnected };
}
