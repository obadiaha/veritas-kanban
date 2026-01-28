// WebSocket Message Types

import type { AttemptStatus } from './task.types.js';

export type WSMessageType = 
  | 'agent:output'
  | 'agent:status'
  | 'agent:complete'
  | 'task:updated'
  | 'error';

export interface WSMessage {
  type: WSMessageType;
  taskId?: string;
  attemptId?: string;
  data: unknown;
  timestamp: string;
}

export interface AgentOutputMessage extends WSMessage {
  type: 'agent:output';
  data: {
    stream: 'stdout' | 'stderr';
    content: string;
  };
}

export interface AgentStatusMessage extends WSMessage {
  type: 'agent:status';
  data: {
    status: AttemptStatus;
    exitCode?: number;
  };
}
