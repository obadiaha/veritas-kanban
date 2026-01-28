/**
 * Shared API client for CLI and MCP
 */

import type { Task } from '../types/task.types.js';

const DEFAULT_BASE = 'http://localhost:3001';

/**
 * Create an API client instance
 * @param baseUrl - Base URL for the API (default: http://localhost:3001)
 * @returns API client function
 */
export function createApiClient(baseUrl = DEFAULT_BASE) {
  return async function api<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
      throw new Error(error.error || `API error: ${res.status}`);
    }

    if (res.status === 204) {
      return undefined as T;
    }
    return res.json() as Promise<T>;
  };
}

/**
 * Default API client using environment variable or localhost
 * Uses typeof check to avoid ReferenceError in browser environments
 */
export const API_BASE = (typeof process !== 'undefined' && process.env?.VK_API_URL) || DEFAULT_BASE;
export const api = createApiClient(API_BASE);

/**
 * Find task by ID (supports partial matching on ID suffix)
 * @param id - Full or partial task ID
 * @param apiClient - Optional custom API client (defaults to shared api client)
 * @returns Task if found, null otherwise
 */
export async function findTask(id: string, apiClient = api): Promise<Task | null> {
  const tasks = await apiClient<Task[]>('/api/tasks');
  return tasks.find(t => t.id === id || t.id.endsWith(id)) || null;
}
