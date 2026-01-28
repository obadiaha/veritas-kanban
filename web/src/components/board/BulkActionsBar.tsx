import { useState } from 'react';
import { X, Trash2, Archive, ArrowRight, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBulkActions } from '@/hooks/useBulkActions';
import { useUpdateTask, useDeleteTask, useArchiveTask } from '@/hooks/useTasks';
import type { TaskStatus } from '@veritas-kanban/shared';

interface BulkActionsBarProps {
  allTaskIds: string[];
}

export function BulkActionsBar({ allTaskIds }: BulkActionsBarProps) {
  const {
    selectedIds,
    isSelecting,
    toggleSelecting,
    selectAll,
    clearSelection,
  } = useBulkActions();
  
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const archiveTask = useArchiveTask();
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedCount = selectedIds.size;
  const allSelected = selectedCount === allTaskIds.length && allTaskIds.length > 0;

  const handleSelectAll = () => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll(allTaskIds);
    }
  };

  const handleMoveToStatus = async (status: TaskStatus) => {
    setIsProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          updateTask.mutateAsync({ id, input: { status } })
        )
      );
      clearSelection();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleArchiveSelected = async () => {
    setIsProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => archiveTask.mutateAsync(id))
      );
      clearSelection();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSelected = async () => {
    setIsProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => deleteTask.mutateAsync(id))
      );
      clearSelection();
    } finally {
      setIsProcessing(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!isSelecting) {
    return (
      <div className="flex justify-end mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSelecting}
          className="text-muted-foreground"
        >
          <CheckSquare className="h-4 w-4 mr-1" />
          Select
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-4 p-3 rounded-lg bg-muted/50 border" role="toolbar" aria-label="Bulk actions">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSelecting}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            aria-label={allSelected ? 'Deselect all tasks' : 'Select all tasks'}
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </Button>
          
          <span className="text-sm text-muted-foreground">
            {selectedCount} selected
          </span>
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            {/* Move to status */}
            <Select
              value=""
              onValueChange={(value) => handleMoveToStatus(value as TaskStatus)}
              disabled={isProcessing}
            >
              <SelectTrigger className="w-[140px]">
                <div className="flex items-center gap-1">
                  <ArrowRight className="h-4 w-4" />
                  <span>Move to...</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>

            {/* Archive */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleArchiveSelected}
              disabled={isProcessing}
            >
              <Archive className="h-4 w-4 mr-1" />
              Archive
            </Button>

            {/* Delete */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isProcessing}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} task{selectedCount !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected tasks will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
