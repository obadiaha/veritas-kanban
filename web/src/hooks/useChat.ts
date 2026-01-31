import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { chatApi } from '@/lib/api/chat';
import type { ChatMessage, ChatSendInput } from '@veritas-kanban/shared';

/**
 * List all chat sessions
 */
export function useChatSessions() {
  return useQuery({
    queryKey: ['chat', 'sessions'],
    queryFn: chatApi.listSessions,
    staleTime: 30_000,
  });
}

/**
 * Get a single chat session with messages
 */
export function useChatSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['chat', 'sessions', sessionId],
    queryFn: () => chatApi.getSession(sessionId!),
    enabled: !!sessionId,
    staleTime: 10_000,
  });
}

/**
 * Send a chat message
 */
export function useSendChatMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ChatSendInput) => chatApi.sendMessage(input),
    onSuccess: (session) => {
      // Update the session cache
      queryClient.setQueryData(['chat', 'sessions', session.id], session);
      // Invalidate sessions list
      queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] });
    },
  });
}

/**
 * Delete a chat session
 */
export function useDeleteChatSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => chatApi.deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'sessions'] });
    },
  });
}

/**
 * Listen for streaming chat messages via WebSocket
 * This is a placeholder for when WebSocket streaming is implemented
 */
export function useChatStream(sessionId: string | undefined) {
  const [streamingMessage, setStreamingMessage] = useState<Partial<ChatMessage> | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sessionId) return;

    // TODO: Connect to WebSocket and listen for chat:message:chunk events
    // For now, this is a placeholder. When backend WebSocket streaming is ready:
    // 1. Subscribe to chat:message:chunk events for this sessionId
    // 2. Accumulate chunks in streamingMessage state
    // 3. On chat:message:complete, clear streaming + invalidate session query
    return () => {
      setStreamingMessage(null);
    };
  }, [sessionId, queryClient]);

  return { streamingMessage };
}
