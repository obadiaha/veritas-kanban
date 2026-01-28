import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { TagConfig } from '@veritas-kanban/shared';
import { useManagedList } from './useManagedList';
import { managedList } from '../lib/api';

export function useTags() {
  return useManagedList<TagConfig>({
    endpoint: '/tags',
    queryKey: ['tags'],
  });
}

export function useTagsManager() {
  const queryClient = useQueryClient();
  const api = managedList.createHelpers<TagConfig>('/tags');

  const createMutation = useMutation({
    mutationFn: (input: { label: string; color: string }) => api.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TagConfig> }) => api.update(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ id, force = false }: { id: string; force?: boolean }) => api.remove(id, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => api.reorder(orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  return {
    create: createMutation.mutateAsync,
    update: (id: string, patch: Partial<TagConfig>) => updateMutation.mutateAsync({ id, patch }),
    remove: (id: string, force = false) => removeMutation.mutateAsync({ id, force }),
    reorder: reorderMutation.mutateAsync,
    canDelete: api.canDelete,
  };
}

/**
 * Get the color for a tag by its ID
 */
export function getTagColor(tags: TagConfig[], tagId: string): string {
  const tag = tags.find(t => t.id === tagId);
  return tag?.color || 'bg-slate-500/20 text-slate-400';
}
