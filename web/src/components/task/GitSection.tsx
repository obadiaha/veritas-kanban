import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useConfig, useRepoBranches } from '@/hooks/useConfig';
import { GitBranch, FolderGit2, Loader2, AlertCircle } from 'lucide-react';
import type { Task, TaskGit } from '@veritas-kanban/shared';

interface GitSectionProps {
  task: Task;
  onGitChange: (git: Partial<TaskGit> | undefined) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function GitSection({ task, onGitChange }: GitSectionProps) {
  const { data: config, isLoading: configLoading } = useConfig();
  const [selectedRepo, setSelectedRepo] = useState<string>(task.git?.repo || '');
  const [baseBranch, setBaseBranch] = useState<string>(task.git?.baseBranch || '');
  const [featureBranch, setFeatureBranch] = useState<string>(task.git?.branch || '');
  const [autoGenerateBranch, setAutoGenerateBranch] = useState(!task.git?.branch);

  const { data: branches, isLoading: branchesLoading } = useRepoBranches(selectedRepo || undefined);

  // Get the repo config for the selected repo
  const repoConfig = useMemo(() => {
    return config?.repos.find(r => r.name === selectedRepo);
  }, [config, selectedRepo]);

  // Auto-generate feature branch name from task title
  useEffect(() => {
    if (autoGenerateBranch && task.title) {
      const slug = slugify(task.title);
      setFeatureBranch(`feature/${slug}`);
    }
  }, [task.title, autoGenerateBranch]);

  // Set default base branch when repo changes
  useEffect(() => {
    if (repoConfig && !baseBranch) {
      setBaseBranch(repoConfig.defaultBranch);
    }
  }, [repoConfig, baseBranch]);

  // Sync from task.git when it changes
  useEffect(() => {
    if (task.git) {
      setSelectedRepo(task.git.repo || '');
      setBaseBranch(task.git.baseBranch || '');
      setFeatureBranch(task.git.branch || '');
      setAutoGenerateBranch(!task.git.branch);
    }
  }, [task.id]); // Only re-sync when task changes

  // Update parent when values change
  const handleRepoChange = (repo: string) => {
    setSelectedRepo(repo);
    const newRepoConfig = config?.repos.find(r => r.name === repo);
    const newBaseBranch = newRepoConfig?.defaultBranch || 'main';
    setBaseBranch(newBaseBranch);
    
    onGitChange({
      repo,
      baseBranch: newBaseBranch,
      branch: featureBranch,
    });
  };

  const handleBaseBranchChange = (branch: string) => {
    setBaseBranch(branch);
    onGitChange({
      repo: selectedRepo,
      baseBranch: branch,
      branch: featureBranch,
    });
  };

  const handleFeatureBranchChange = (branch: string) => {
    setFeatureBranch(branch);
    setAutoGenerateBranch(false);
    onGitChange({
      repo: selectedRepo,
      baseBranch,
      branch,
    });
  };

  const handleClearGit = () => {
    setSelectedRepo('');
    setBaseBranch('');
    setFeatureBranch('');
    setAutoGenerateBranch(true);
    onGitChange(undefined);
  };

  if (configLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-muted-foreground flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Git Integration
        </Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (!config?.repos.length) {
    return (
      <div className="space-y-2">
        <Label className="text-muted-foreground flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Git Integration
        </Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-md border border-dashed">
          <AlertCircle className="h-4 w-4" />
          No repositories configured. Add one in Settings.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Git Integration
        </Label>
        {selectedRepo && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={handleClearGit}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="grid gap-3 p-3 rounded-md border bg-muted/30">
        {/* Repository Selection */}
        <div className="grid gap-1.5">
          <Label className="text-xs">Repository</Label>
          <Select value={selectedRepo} onValueChange={handleRepoChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select repository..." />
            </SelectTrigger>
            <SelectContent>
              {config.repos.map((repo) => (
                <SelectItem key={repo.name} value={repo.name}>
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="h-3 w-3" />
                    {repo.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedRepo && (
          <>
            {/* Base Branch */}
            <div className="grid gap-1.5">
              <Label className="text-xs">Base Branch</Label>
              {branchesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground h-9 px-3">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading branches...
                </div>
              ) : (
                <Select value={baseBranch} onValueChange={handleBaseBranchChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select base branch..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.map((branch) => (
                      <SelectItem key={branch} value={branch}>
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Feature Branch */}
            <div className="grid gap-1.5">
              <Label className="text-xs">Feature Branch</Label>
              <Input
                value={featureBranch}
                onChange={(e) => handleFeatureBranchChange(e.target.value)}
                placeholder="feature/my-feature"
              />
              {autoGenerateBranch && featureBranch && (
                <p className="text-xs text-muted-foreground">
                  Auto-generated from task title
                </p>
              )}
            </div>

            {/* Worktree Status */}
            {task.git?.worktreePath && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Worktree active: {task.git.worktreePath}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
