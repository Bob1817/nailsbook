import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

export function useTyping(socket: Socket | null, conversationId: number | null) {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!socket || !conversationId) return;

    const onTypingStart = (data: { conversationId: number }) => {
      if (data.conversationId !== conversationId) return;
      setIsOtherTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 5000);
    };

    const onTypingStop = (data: { conversationId: number }) => {
      if (data.conversationId !== conversationId) return;
      setIsOtherTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };

    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);

    return () => {
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [socket, conversationId]);

  const emitTyping = useCallback(() => {
    if (!socket || !conversationId) return;
    socket.emit('typing:start', { conversationId });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId });
    }, 2000);
  }, [socket, conversationId]);

  const stopTyping = useCallback(() => {
    if (!socket || !conversationId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    socket.emit('typing:stop', { conversationId });
  }, [socket, conversationId]);

  return { isOtherTyping, emitTyping, stopTyping };
}
