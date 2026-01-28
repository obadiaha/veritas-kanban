import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Connects to the Veritas Kanban WebSocket server and listens for
 * task:changed events. When received, invalidates the React Query
 * task cache so the board updates in real-time.
 */
export function useTaskSync() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    function connect() {
      if (!mounted) return;

      // Determine WebSocket URL from current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // In dev (port 3000/5173), the API is on port 3001; in prod it's same host
      const isDev = ['3000', '5173'].includes(window.location.port);
      const wsHost = isDev
        ? `${protocol}//localhost:3001/ws`
        : `${protocol}//${window.location.host}/ws`;

      const ws = new WebSocket(wsHost);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send a subscribe message for task changes
        ws.send(JSON.stringify({ type: 'subscribe:tasks' }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'task:changed') {
            // Invalidate task queries to trigger a refetch
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            
            // Also invalidate specific task if we know which one
            if (message.taskId) {
              queryClient.invalidateQueries({ queryKey: ['tasks', message.taskId] });
            }

            // If it's an archive-related change, also invalidate archive queries
            if (message.changeType === 'archived' || message.changeType === 'restored') {
              queryClient.invalidateQueries({ queryKey: ['tasks', 'archived'] });
              queryClient.invalidateQueries({ queryKey: ['tasks', 'archive-suggestions'] });
            }
          }
        } catch {
          // Ignore parse errors for non-task messages
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        // Reconnect after 3 seconds
        if (mounted) {
          reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      mounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [queryClient]);
}
