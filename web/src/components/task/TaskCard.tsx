import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import type { Task, TaskPriority, TaskTypeConfig, ProjectConfig, TagConfig } from '@veritas-kanban/shared';
import { Check, Ban, Clock, Timer, Loader2, Paperclip } from 'lucide-react';
import { useBulkActions } from '@/hooks/useBulkActions';
import { formatDuration } from '@/hooks/useTimeTracking';
import { getTypeIcon, getTypeColor } from '@/hooks/useTaskTypes';
import { getProjectColor, getProjectLabel } from '@/hooks/useProjects';
import { getTagColor } from '@/hooks/useTags';

const agentNames: Record<string, string> = {
  'claude-code': 'Claude',
  'amp': 'Amp',
  'copilot': 'Copilot',
  'gemini': 'Gemini',
  'veritas': 'Veritas',
};

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
  isBlocked?: boolean;
  blockerTitles?: string[];
  taskTypes?: TaskTypeConfig[];
  projects?: ProjectConfig[];
  tags?: TagConfig[];
}

const priorityColors: Record<TaskPriority, string> = {
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-slate-500/20 text-slate-400',
};

export function TaskCard({ task, isDragging, onClick, isSelected, isBlocked, blockerTitles, taskTypes = [], projects = [], tags = [] }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isCurrentlyDragging } = useDraggable({
    id: task.id,
  });
  const { isSelecting, toggleSelect, isSelected: isBulkSelected } = useBulkActions();
  const isChecked = isBulkSelected(task.id);

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const handleClick = () => {
    // Don't open detail panel if we're dragging
    if (isCurrentlyDragging || isDragging) return;
    
    // If in selection mode, toggle selection instead
    if (isSelecting) {
      toggleSelect(task.id);
      return;
    }
    
    onClick?.();
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSelect(task.id);
  };

  const isAgentRunning = task.attempt?.status === 'running';
  
  // Get type info dynamically
  const typeIconName = taskTypes.find(t => t.id === task.type)?.icon || 'Code';
  const TypeIconComponent = getTypeIcon(typeIconName);
  const typeColor = getTypeColor(taskTypes, task.type);
  
  // Get project info dynamically
  const projectColor = task.project ? getProjectColor(projects, task.project) : 'bg-muted';
  const projectLabel = task.project ? getProjectLabel(projects, task.project) : '';

  return (
    <TooltipProvider>
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={handleClick}
            className={cn(
              'group bg-card border border-border rounded-md p-3 cursor-grab active:cursor-grabbing',
              'hover:border-muted-foreground/50 hover:bg-card/80 transition-all',
              'border-l-2',
              typeColor,
              isDragging && 'opacity-50 shadow-lg rotate-2 scale-105',
              isCurrentlyDragging && 'opacity-50',
              isSelected && 'ring-2 ring-primary border-primary',
              isAgentRunning && 'ring-2 ring-blue-500/50 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
            )}
          >
            <div className="flex items-start gap-2">
              {isSelecting && (
                <button
                  onClick={handleCheckboxClick}
                  className={cn(
                    'h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
                    isChecked
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-muted-foreground/50 hover:border-primary'
                  )}
                >
                  {isChecked && <Check className="h-3 w-3" />}
                </button>
              )}
              <span className="text-muted-foreground mt-0.5 flex-shrink-0">
                {TypeIconComponent && <TypeIconComponent className="h-3.5 w-3.5" />}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium leading-tight truncate">
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {task.description}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* Agent running indicator */}
              {isAgentRunning && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 flex items-center gap-1 animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {agentNames[task.attempt?.agent || ''] || 'Agent'} running
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">Agent Active</p>
                    <p className="text-sm">{agentNames[task.attempt?.agent || ''] || task.attempt?.agent} is working on this task</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {isBlocked && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 flex items-center gap-1">
                      <Ban className="h-3 w-3" />
                      Blocked
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">Blocked by:</p>
                    <ul className="text-sm">
                      {blockerTitles?.map((title, i) => (
                        <li key={i}>• {title}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              )}
              {task.project && (
                <span className={cn("text-xs px-1.5 py-0.5 rounded", projectColor)}>
                  {projectLabel}
                </span>
              )}
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded capitalize',
                priorityColors[task.priority]
              )}>
                {task.priority}
              </span>
              {task.tags && task.tags.length > 0 && (
                <>
                  {task.tags.slice(0, 2).map((tagId) => {
                    const tagColor = getTagColor(tags, tagId);
                    const tagLabel = tags.find(t => t.id === tagId)?.label || tagId;
                    return (
                      <Badge
                        key={tagId}
                        variant="secondary"
                        className={cn('text-xs px-1.5 py-0.5', tagColor)}
                      >
                        {tagLabel}
                      </Badge>
                    );
                  })}
                  {task.tags.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{task.tags.length - 2}
                    </span>
                  )}
                </>
              )}
              {/* Attachment indicator */}
              {task.attachments && task.attachments.length > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  {task.attachments.length}
                </span>
              )}
              {/* Time tracking indicator */}
              {(task.timeTracking?.totalSeconds || task.timeTracking?.isRunning) && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ml-auto",
                  task.timeTracking?.isRunning 
                    ? "bg-green-500/20 text-green-500" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {task.timeTracking?.isRunning ? (
                    <Timer className="h-3 w-3 animate-pulse" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  {formatDuration(task.timeTracking?.totalSeconds || 0)}
                </span>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium">{task.title}</p>
          {task.description && (
            <p className="text-muted-foreground text-sm mt-1">{task.description}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
