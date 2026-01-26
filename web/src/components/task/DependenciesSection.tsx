import { useState, useMemo } from 'react';
import { Plus, X, Ban, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useTasks, isTaskBlocked } from '@/hooks/useTasks';
import { cn } from '@/lib/utils';
import type { Task } from '@veritas-kanban/shared';

interface DependenciesSectionProps {
  task: Task;
  onBlockedByChange: (blockedBy: string[] | undefined) => void;
}

export function DependenciesSection({ task, onBlockedByChange }: DependenciesSectionProps) {
  const { data: allTasks } = useTasks();
  const [isAdding, setIsAdding] = useState(false);

  const blockedBy = task.blockedBy || [];

  // Get available tasks to block on (not self, not already blocking)
  const availableTasks = useMemo(() => {
    if (!allTasks) return [];
    return allTasks.filter(t => 
      t.id !== task.id && 
      !blockedBy.includes(t.id) &&
      t.status !== 'done' // Don't show completed tasks as options
    );
  }, [allTasks, task.id, blockedBy]);

  // Get current blockers with their details
  const blockerTasks = useMemo(() => {
    if (!allTasks) return [];
    return blockedBy.map(id => allTasks.find(t => t.id === id)).filter(Boolean) as Task[];
  }, [allTasks, blockedBy]);

  const isCurrentlyBlocked = useMemo(() => {
    if (!allTasks) return false;
    return isTaskBlocked(task, allTasks);
  }, [task, allTasks]);

  const handleAddBlocker = (taskId: string) => {
    const newBlockedBy = [...blockedBy, taskId];
    onBlockedByChange(newBlockedBy);
    setIsAdding(false);
  };

  const handleRemoveBlocker = (taskId: string) => {
    const newBlockedBy = blockedBy.filter(id => id !== taskId);
    onBlockedByChange(newBlockedBy.length > 0 ? newBlockedBy : undefined);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground">Dependencies</Label>
        {isCurrentlyBlocked && (
          <Badge variant="destructive" className="text-xs">
            <Ban className="h-3 w-3 mr-1" />
            Blocked
          </Badge>
        )}
      </div>

      {/* Current blockers */}
      {blockerTasks.length > 0 && (
        <div className="space-y-1">
          {blockerTasks.map(blocker => (
            <div
              key={blocker.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded-md bg-muted/50 group",
                blocker.status === 'done' && "opacity-60"
              )}
            >
              {blocker.status === 'done' ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              ) : (
                <Ban className="h-4 w-4 text-red-400 flex-shrink-0" />
              )}
              <span className={cn(
                "flex-1 text-sm truncate",
                blocker.status === 'done' && "line-through text-muted-foreground"
              )}>
                {blocker.title}
              </span>
              <Badge variant="secondary" className="text-xs">
                {blocker.status}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemoveBlocker(blocker.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add blocker */}
      {isAdding ? (
        <div className="flex gap-2">
          <Select onValueChange={handleAddBlocker}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a task..." />
            </SelectTrigger>
            <SelectContent>
              {availableTasks.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No available tasks
                </div>
              ) : (
                availableTasks.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="truncate">{t.title}</span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Dependency
        </Button>
      )}

      {blockerTasks.length === 0 && !isAdding && (
        <p className="text-xs text-muted-foreground">
          No dependencies. This task can be started anytime.
        </p>
      )}
    </div>
  );
}
