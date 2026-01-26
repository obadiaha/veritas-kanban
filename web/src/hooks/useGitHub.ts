import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api';

export interface GitHubStatus {
  installed: boolean;
  authenticated: boolean;
  user?: string;
}

export interface PRInfo {
  url: string;
  number: number;
  title: string;
  state: string;
  draft: boolean;
  headBranch: string;
  baseBranch: string;
}

export interface CreatePRInput {
  taskId: string;
  title?: string;
  body?: string;
  targetBranch?: string;
  draft?: boolean;
}

/**
 * Check GitHub CLI status
 */
export function useGitHubStatus() {
  return useQuery<GitHubStatus>({
    queryKey: ['github', 'status'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/github/status`);
      if (!response.ok) {
        throw new Error('Failed to check GitHub status');
      }
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Create a PR for a task
 */
export function useCreatePR() {
  const queryClient = useQueryClient();

  return useMutation<PRInfo, Error, CreatePRInput>({
    mutationFn: async (input) => {
      const response = await fetch(`${API_BASE}/github/pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create PR');
      }
      
      return response.json();
    },
    onSuccess: (_data, variables) => {
      // Invalidate the task to refresh its PR info
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
    },
  });
}

/**
 * Open PR in browser
 */
export function useOpenPR() {
  return useMutation<void, Error, string>({
    mutationFn: async (taskId) => {
      const response = await fetch(`${API_BASE}/github/pr/${taskId}/open`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to open PR');
      }
    },
  });
}
