import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useSocket } from './useSocket';

interface PresenceContextValue {
  isOnline: (userId: number, userType: string) => boolean;
  onlineUsers: Set<string>;
}

const PresenceContext = createContext<PresenceContextValue>({
  isOnline: () => false,
  onlineUsers: new Set(),
});

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!socket) return;

    const makeKey = (userId: number, userType: string) => `${userType}:${userId}`;

    const onSync = (data: { onlineUsers: Array<{ userId: number; userType: string }> }) => {
      setOnlineUsers(new Set(data.onlineUsers.map((u) => makeKey(u.userId, u.userType))));
    };

    const onOnline = (data: { userId: number; userType: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.add(makeKey(data.userId, data.userType));
        return next;
      });
    };

    const onOffline = (data: { userId: number; userType: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(makeKey(data.userId, data.userType));
        return next;
      });
    };

    socket.on('presence:sync', onSync);
    socket.on('presence:online', onOnline);
    socket.on('presence:offline', onOffline);

    return () => {
      socket.off('presence:sync', onSync);
      socket.off('presence:online', onOnline);
      socket.off('presence:offline', onOffline);
    };
  }, [socket]);

  const isOnline = useCallback(
    (userId: number, userType: string) => onlineUsers.has(`${userType}:${userId}`),
    [onlineUsers],
  );

  return (
    <PresenceContext.Provider value={{ isOnline, onlineUsers }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext);
}
