import { useState, useEffect, useCallback } from 'react';
import { useUpdateTask } from './useTasks';
import type { Task } from '@veritas-kanban/shared';

export function useDebouncedSave(task: Task | null) {
  const updateTask = useUpdateTask();
  const [localTask, setLocalTask] = useState<Task | null>(task);
  const [changedFields, setChangedFields] = useState<Set<keyof Task>>(new Set());

  // Sync from server when task prop changes (e.g., refetch)
  useEffect(() => {
    setLocalTask(task);
    setChangedFields(new Set());
  }, [task]);

  // Debounced save - only send fields that were actually changed
  useEffect(() => {
    if (changedFields.size === 0 || !localTask) return;

    const timeout = setTimeout(() => {
      // Build input with only changed fields
      const input: Record<string, unknown> = {};
      changedFields.forEach(field => {
        input[field] = localTask[field];
      });

      updateTask.mutate({
        id: localTask.id,
        input,
      });
      setChangedFields(new Set());
    }, 500);

    return () => clearTimeout(timeout);
  }, [localTask, changedFields, updateTask]);

  const updateField = useCallback(<K extends keyof Task>(field: K, value: Task[K]) => {
    setLocalTask(prev => prev ? { ...prev, [field]: value } : null);
    setChangedFields(prev => new Set(prev).add(field));
  }, []);

  const isDirty = changedFields.size > 0;

  return { localTask, updateField, isDirty };
}
