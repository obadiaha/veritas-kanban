/**
 * Chat API functions
 */
import { API_BASE, handleResponse } from './helpers';
import type { ChatSession, ChatSendInput } from '@veritas-kanban/shared';

/**
 * List all chat sessions
 */
export async function listSessions(): Promise<ChatSession[]> {
  const response = await fetch(`${API_BASE}/chat/sessions`, {
    credentials: 'include',
  });
  return handleResponse<ChatSession[]>(response);
}

/**
 * Get a single chat session with messages
 */
export async function getSession(sessionId: string): Promise<ChatSession> {
  const response = await fetch(`${API_BASE}/chat/sessions/${sessionId}`, {
    credentials: 'include',
  });
  return handleResponse<ChatSession>(response);
}

/**
 * Chat send response from the API
 * (Not a full ChatSession — agent response streams via WebSocket)
 */
export interface ChatSendResponse {
  sessionId: string;
  messageId: string;
  message: string;
}

/**
 * Send a chat message
 */
export async function sendMessage(input: ChatSendInput): Promise<ChatSendResponse> {
  const response = await fetch(`${API_BASE}/chat/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  return handleResponse<ChatSendResponse>(response);
}

/**
 * Delete a chat session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/chat/sessions/${sessionId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handleResponse<void>(response);
}

export const chatApi = {
  listSessions,
  getSession,
  sendMessage,
  deleteSession,
};
