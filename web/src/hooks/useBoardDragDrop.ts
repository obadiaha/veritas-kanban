import { useState, useCallback } from 'react';
import {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { Task, TaskStatus } from '@veritas-kanban/shared';

interface UseBoardDragDropOptions {
  tasks: Task[];
  tasksByStatus: Record<TaskStatus, Task[]>;
  columns: { id: TaskStatus; title: string }[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onReorder: (taskIds: string[], onSuccess?: () => void) => void;
}

interface UseBoardDragDropReturn {
  activeTask: Task | null;
  sensors: ReturnType<typeof useSensors>;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
}

export function useBoardDragDrop({
  tasks,
  tasksByStatus,
  columns,
  onStatusChange,
  onReorder,
}: UseBoardDragDropOptions): UseBoardDragDropReturn {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Find which column a task belongs to
  const findColumnForTask = useCallback(
    (taskId: string): TaskStatus | null => {
      for (const col of columns) {
        if (tasksByStatus[col.id]?.some((t: Task) => t.id === taskId)) {
          return col.id;
        }
      }
      return null;
    },
    [columns, tasksByStatus]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks?.find((t) => t.id === event.active.id);
      if (task) {
        setActiveTask(task);
      }
    },
    [tasks]
  );

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // We don't need real-time container switching since our columns
    // are droppable targets and tasks are sortable within them.
    // The visual reordering within a column is handled by SortableContext.
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTask(null);

      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Check if dropped on a column (status) directly
      const isOverColumn = columns.some((c) => c.id === overId);

      if (isOverColumn) {
        // Dropped on empty column area — change status only
        const newStatus = overId as TaskStatus;
        const task = tasks?.find((t) => t.id === activeId);
        if (task && task.status !== newStatus) {
          onStatusChange(activeId, newStatus);
        }
        return;
      }

      // Dropped on another task — figure out source/destination columns
      const activeColumn = findColumnForTask(activeId);
      const overColumn = findColumnForTask(overId);

      if (!activeColumn || !overColumn) return;

      if (activeColumn === overColumn) {
        // Same column — reorder
        const columnTasks = tasksByStatus[activeColumn];
        const oldIndex = columnTasks.findIndex((t: Task) => t.id === activeId);
        const newIndex = columnTasks.findIndex((t: Task) => t.id === overId);

        if (oldIndex !== newIndex) {
          const reordered = arrayMove(columnTasks, oldIndex, newIndex);
          onReorder(reordered.map((t: Task) => t.id));
        }
      } else {
        // Cross-column: change status, then insert at the target position
        const destTasks = [...tasksByStatus[overColumn]];
        const overIndex = destTasks.findIndex((t: Task) => t.id === overId);

        // First update the task's status
        onStatusChange(activeId, overColumn);
        
        // Build the new order for the destination column including the moved task
        const newOrder = destTasks.map((t: Task) => t.id);
        newOrder.splice(overIndex, 0, activeId);
        onReorder(newOrder);
      }
    },
    [columns, findColumnForTask, onReorder, onStatusChange, tasks, tasksByStatus]
  );

  return {
    activeTask,
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
