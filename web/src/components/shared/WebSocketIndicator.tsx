import { useWebSocketStatus } from '@/contexts/WebSocketContext';
import { Wifi, WifiOff } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/**
 * Tiny indicator showing WebSocket connection status.
 * Green dot + wifi icon = connected (real-time updates active)
 * Red dot + wifi-off icon = disconnected (falling back to polling)
 *
 * Click to see a brief explanation of what it means.
 */
export function WebSocketIndicator() {
  const { isConnected } = useWebSocketStatus();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer select-none rounded px-1.5 py-1 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={isConnected ? 'WebSocket connected' : 'WebSocket disconnected'}
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              isConnected
                ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]'
                : 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.4)]'
            }`}
          />
          {isConnected ? (
            <Wifi className="h-3 w-3 text-green-500" />
          ) : (
            <WifiOff className="h-3 w-3 text-red-500" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-64 p-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500 shrink-0" />
            )}
            <span className="text-sm font-medium">
              {isConnected ? 'Real-time sync active' : 'Disconnected'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isConnected
              ? 'Board updates are delivered instantly via WebSocket. Changes from agents and other tabs appear in real time.'
              : 'WebSocket connection lost. The board is polling the server every 10 seconds for updates. Reconnecting automatically…'}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
