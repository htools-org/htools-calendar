import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import type { DefaultEventsMap } from '@socket.io/component-emitter';
import type { Socket } from 'socket.io-client';

let socket: Socket<DefaultEventsMap, DefaultEventsMap> | null = null;

export function useSocket() {
  useEffect(() => {
    socket = io();
  }, []);

  const [isConnected, setIsConnected] = useState(socket?.connected || false);
  const [currentHeight, setCurrentHeight] = useState(0);

  useEffect(() => {
    if (!socket) return;
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onNewData({ currentHeight }: { currentHeight: number }) {
      setCurrentHeight(currentHeight);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('newData', onNewData);

    return () => {
      if (!socket) return;
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('newData', onNewData);
    };
  }, []);

  return { isConnected, currentHeight };
}
