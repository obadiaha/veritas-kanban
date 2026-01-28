import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Activity, type ActivityType } from '../lib/api';

export type { Activity, ActivityType };

export function useActivities(limit: number = 50) {
  return useQuery({
    queryKey: ['activities', limit],
    queryFn: () => api.activity.list(limit),
    refetchInterval: 30000, // Refresh every 30s
  });
}

export function useClearActivities() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.activity.clear(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}
