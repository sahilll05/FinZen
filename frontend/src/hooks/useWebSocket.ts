import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export type SocketStatus = 'connected' | 'reconnecting' | 'disconnected';

export function useWebSocket() {
  const [status, setStatus] = useState<SocketStatus>('disconnected');
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const wsUrl = API_BASE.replace('http', 'ws');
    
    // Instantiate connection
    const newSocket = io(wsUrl, {
      path: '/ws',
      transports: ['websocket'],
      auth: {
        token: typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
      }
    });

    newSocket.on('connect', () => setStatus('connected'));
    newSocket.on('disconnect', () => setStatus('disconnected'));
    newSocket.on('connect_error', () => setStatus('reconnecting'));

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return { socket, status };
}
