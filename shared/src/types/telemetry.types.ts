// Telemetry Types

import type { TaskStatus, AgentType } from './task.types.js';

export type TelemetryEventType =
  | 'task.created'
  | 'task.status_changed'
  | 'task.archived'
  | 'task.restored'
  | 'run.started'
  | 'run.completed'
  | 'run.error'
  | 'run.tokens';

/** Base telemetry event - all events extend this */
export interface TelemetryEvent {
  id: string;
  type: TelemetryEventType;
  timestamp: string;
  taskId?: string;
  project?: string;
}

/** Task lifecycle events */
export interface TaskTelemetryEvent extends TelemetryEvent {
  type: 'task.created' | 'task.status_changed' | 'task.archived' | 'task.restored';
  taskId: string;
  status?: TaskStatus;
  previousStatus?: TaskStatus;
}

/** Agent run events */
export interface RunTelemetryEvent extends TelemetryEvent {
  type: 'run.started' | 'run.completed' | 'run.error';
  taskId: string;
  attemptId: string;
  agent: AgentType;
  durationMs?: number;
  exitCode?: number;
  success?: boolean;
  error?: string;
}

/** Token usage events */
export interface TokenTelemetryEvent extends TelemetryEvent {
  type: 'run.tokens';
  taskId: string;
  attemptId: string;
  agent: AgentType;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model?: string;
}

/** Union type for all telemetry events */
export type AnyTelemetryEvent = TaskTelemetryEvent | RunTelemetryEvent | TokenTelemetryEvent;

/** Telemetry configuration */
export interface TelemetryConfig {
  enabled: boolean;
  retention: number; // Days to retain events
  traces?: boolean;  // Optional trace collection (future)
}

/** Query options for fetching events */
export interface TelemetryQueryOptions {
  type?: TelemetryEventType | TelemetryEventType[];
  since?: string;  // ISO timestamp
  until?: string;  // ISO timestamp
  taskId?: string;
  project?: string;
  limit?: number;
}
