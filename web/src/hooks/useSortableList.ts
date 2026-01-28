import { useState, useEffect, useCallback } from 'react';
import {
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

interface UseSortableListOptions<T extends { id: string }> {
  items: T[];
  onReorder: (ids: string[]) => Promise<any>;
}

interface UseSortableListReturn<T extends { id: string }> {
  localItems: T[];
  sensors: ReturnType<typeof useSensors>;
  handleDragEnd: (event: DragEndEvent) => void;
  handleMoveUp: (index: number) => void;
  handleMoveDown: (index: number) => void;
}

export function useSortableList<T extends { id: string }>({
  items,
  onReorder,
}: UseSortableListOptions<T>): UseSortableListReturn<T> {
  const [localItems, setLocalItems] = useState(items);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sync local state with incoming items
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = localItems.findIndex((item) => item.id === active.id);
        const newIndex = localItems.findIndex((item) => item.id === over.id);

        const reordered = arrayMove(localItems, oldIndex, newIndex);
        const orderedIds = reordered.map((item) => item.id);

        // Optimistic update
        setLocalItems(reordered);

        // Fire onReorder in background
        onReorder(orderedIds).catch((error) => {
          // Rollback on error
          console.error('Failed to reorder items:', error);
          setLocalItems(items);
        });
      }
    },
    [localItems, items, onReorder]
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const reordered = arrayMove(localItems, index, index - 1);
      const orderedIds = reordered.map((item) => item.id);
      setLocalItems(reordered);
      onReorder(orderedIds).catch((error) => {
        console.error('Failed to reorder items:', error);
        setLocalItems(items);
      });
    },
    [localItems, items, onReorder]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index === localItems.length - 1) return;
      const reordered = arrayMove(localItems, index, index + 1);
      const orderedIds = reordered.map((item) => item.id);
      setLocalItems(reordered);
      onReorder(orderedIds).catch((error) => {
        console.error('Failed to reorder items:', error);
        setLocalItems(items);
      });
    },
    [localItems, items, onReorder]
  );

  return {
    localItems,
    sensors,
    handleDragEnd,
    handleMoveUp,
    handleMoveDown,
  };
}
