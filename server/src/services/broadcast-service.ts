import type { WebSocketServer, WebSocket } from 'ws';

/**
 * Simple broadcast service that sends task change events to all connected WebSocket clients.
 * Initialized with the WebSocketServer instance from index.ts.
 */
let wssRef: WebSocketServer | null = null;

export function initBroadcast(wss: WebSocketServer): void {
  wssRef = wss;
}

export type TaskChangeType = 'created' | 'updated' | 'deleted' | 'archived' | 'restored' | 'reordered';

export interface TaskChangeEvent {
  type: 'task:changed';
  changeType: TaskChangeType;
  taskId?: string;
  timestamp: string;
}

/**
 * Broadcast a task change to all connected WebSocket clients.
 * Clients can listen for 'task:changed' messages and invalidate their query caches.
 */
export function broadcastTaskChange(changeType: TaskChangeType, taskId?: string): void {
  if (!wssRef) return;

  const message: TaskChangeEvent = {
    type: 'task:changed',
    changeType,
    taskId,
    timestamp: new Date().toISOString(),
  };

  const payload = JSON.stringify(message);

  wssRef.clients.forEach((client: WebSocket) => {
    if (client.readyState === 1) { // WebSocket.OPEN = 1
      client.send(payload);
    }
  });
}
