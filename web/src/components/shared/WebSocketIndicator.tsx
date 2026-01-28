import { useWebSocketStatus } from '@/contexts/WebSocketContext';
import { Wifi, WifiOff } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Tiny indicator showing WebSocket connection status.
 * Green dot + wifi icon = connected (real-time updates active)
 * Red dot + wifi-off icon = disconnected (falling back to polling)
 */
export function WebSocketIndicator() {
  const { isConnected } = useWebSocketStatus();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-default select-none">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isConnected
                  ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]'
                  : 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.4)]'
              }`}
              aria-label={isConnected ? 'WebSocket connected' : 'WebSocket disconnected'}
            />
            {isConnected ? (
              <Wifi className="h-3 w-3 text-green-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-red-500" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {isConnected
            ? 'Real-time sync active'
            : 'Disconnected — polling every 10s'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
