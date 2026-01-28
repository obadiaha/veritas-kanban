import { createContext, useContext, type ReactNode } from 'react';

interface WebSocketStatus {
  /** Whether the WebSocket is currently connected */
  isConnected: boolean;
}

const WebSocketStatusContext = createContext<WebSocketStatus>({
  isConnected: false,
});

export function WebSocketStatusProvider({
  children,
  isConnected,
}: {
  children: ReactNode;
  isConnected: boolean;
}) {
  return (
    <WebSocketStatusContext.Provider value={{ isConnected }}>
      {children}
    </WebSocketStatusContext.Provider>
  );
}

/**
 * Returns the current WebSocket connection status.
 * Used by data-fetching hooks to adjust polling intervals:
 * - Connected: reduce polling (WS handles real-time updates)
 * - Disconnected: increase polling as fallback
 */
export function useWebSocketStatus(): WebSocketStatus {
  return useContext(WebSocketStatusContext);
}
