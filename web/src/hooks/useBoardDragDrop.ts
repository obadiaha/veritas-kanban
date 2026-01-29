import { useState, useCallback, useRef } from 'react';
import {
  CollisionDetection,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  pointerWithin,
  rectIntersection,
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
  isDragActive: boolean;
  sensors: ReturnType<typeof useSensors>;
  collisionDetection: CollisionDetection;
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
  const lastOverColumnRef = useRef<TaskStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const columnIds = columns.map((c) => c.id);

  // Custom collision detection for kanban cross-column support.
  // pointerWithin alone misses when the pointer is between cards inside a column,
  // so we fall back to rectIntersection which catches overlapping rects.
  // We always prefer column droppables over task droppables for cross-container moves.
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      // First try pointerWithin — most accurate when pointer is directly over a droppable
      const pointerCollisions = pointerWithin(args);

      if (pointerCollisions.length > 0) {
        // If we hit a column droppable, prefer it for cross-column detection
        const columnCollision = pointerCollisions.find((c) =>
          columnIds.includes(c.id as TaskStatus)
        );
        // Also check for task collisions within the column
        const taskCollision = pointerCollisions.find(
          (c) => !columnIds.includes(c.id as TaskStatus)
        );

        // If we found a task inside the target column, prefer it (for precise positioning)
        if (taskCollision) return [taskCollision];
        // Otherwise use the column (for drops into empty areas or between tasks)
        if (columnCollision) return [columnCollision];

        return pointerCollisions;
      }

      // Fallback to rect intersection when pointer isn't directly within any droppable
      return rectIntersection(args);
    },
    [columnIds]
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
        lastOverColumnRef.current = null;
      }
    },
    [tasks]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Determine which column the active task is currently in
      const activeColumn = findColumnForTask(activeId);
      if (!activeColumn) return;

      // Determine the target column — either the column directly, or the column a task belongs to
      const isOverColumn = columnIds.includes(overId as TaskStatus);
      const overColumn = isOverColumn ? (overId as TaskStatus) : findColumnForTask(overId);

      if (!overColumn || activeColumn === overColumn) return;

      // Track which column we're over for handleDragEnd
      lastOverColumnRef.current = overColumn;
    },
    [columnIds, findColumnForTask]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);
      lastOverColumnRef.current = null;

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Check if dropped on a column (status) directly
      const isOverColumn = columnIds.includes(overId as TaskStatus);

      if (isOverColumn) {
        // Dropped on column area — change status
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

        // Update the task's status to the destination column
        onStatusChange(activeId, overColumn);

        // Build the new order for the destination column including the moved task
        const newOrder = destTasks.map((t: Task) => t.id);
        newOrder.splice(overIndex, 0, activeId);
        onReorder(newOrder);
      }
    },
    [columnIds, findColumnForTask, onReorder, onStatusChange, tasks, tasksByStatus]
  );

  return {
    activeTask,
    isDragActive: activeTask !== null,
    sensors,
    collisionDetection,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
