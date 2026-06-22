'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export type StreamState = 'connecting' | 'live' | 'fallback' | 'idle';

interface UseRealtimeOptions {
  enabled?: boolean;
  on?: Record<string, (data: unknown) => void>;
  rooms?: string[];
}

function useRealtime(options: UseRealtimeOptions = {}) {
  const { enabled = true, on = {}, rooms = [] } = options;
  const [state, setState] = useState<StreamState>('idle');
  const socketRef = useRef<Socket | null>(null);
  const onRef = useRef(on);
  const roomsRef = useRef(rooms);
  onRef.current = on;
  roomsRef.current = rooms;

  const joinRoom = useCallback((room: string) => {
    socketRef.current?.emit('room:join', { room });
  }, []);

  const leaveRoom = useCallback((room: string) => {
    socketRef.current?.emit('room:leave', { room });
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState('idle');
      return;
    }

    if (typeof navigator !== 'undefined' && (navigator as unknown as { webdriver?: boolean }).webdriver) {
      setState('fallback');
      return;
    }

    setState('connecting');

    const socket: Socket = io(API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      forceNew: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setState('live');
      // Join specified rooms after connection
      roomsRef.current.forEach((room) => {
        socket.emit('room:join', { room });
      });
    });

    // Register custom event listeners
    const registeredEvents: string[] = [];
    Object.entries(onRef.current).forEach(([event, handler]) => {
      socket.on(event, handler);
      registeredEvents.push(event);
    });

    socket.on('connect_error', () => {
      setState('fallback');
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
    // Re-run only when enabled changes; event listeners update via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { state, joinRoom, leaveRoom, socket: socketRef };
}

export { useRealtime };
