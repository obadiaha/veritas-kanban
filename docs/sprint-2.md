# Sprint 2: Git Integration & Worktrees

**Goal:** Code tasks can be associated with git repos and run in isolated worktrees.

**Started:** 2026-01-26
**Status:** Complete ✅

---

## Stories

| ID | Title | Status | Notes |
|----|-------|--------|-------|
| US-201 | Project/repo configuration | ✅ Complete | ConfigService + Settings UI |
| US-202 | Code task git fields | ✅ Complete | GitSection component |
| US-203 | Git worktree creation | ✅ Complete | WorktreeService |
| US-204 | Worktree status display | ✅ Complete | Ahead/behind, changes |
| US-205 | Branch operations (rebase, merge) | ✅ Complete | With confirmations |
| US-206 | Worktree cleanup | ✅ Complete | Force delete option |

---

## Progress Log

### 2026-01-26

**US-201: Project/repo configuration** ✅
- ConfigService for repos and agents
- Config API routes with validation
- Settings dialog in UI
- Path validation against real git repos

**US-202: Code task git fields** ✅
- GitSection component for task detail
- Repo dropdown from configured repos
- Base branch fetched from repo
- Feature branch auto-generated from title
- Git fields saved via debounced save

**US-203: Git worktree creation** ✅
- WorktreeService using simple-git
- `POST /api/tasks/:id/worktree`
- Creates at `.veritas-kanban/worktrees/{task-id}/`
- Creates branch from base or uses existing
- Updates task with worktree path

**US-204: Worktree status display** ✅
- `GET /api/tasks/:id/worktree` returns status
- Shows: branch, ahead/behind, changed files
- "Create Worktree" button if none exists
- "Open in VS Code" via vscode:// protocol
- Auto-refresh every 10 seconds

**US-205: Branch operations** ✅
- `POST /api/tasks/:id/worktree/rebase`
- `POST /api/tasks/:id/worktree/merge`
- Merge: merges, pushes, deletes worktree, marks done
- Confirmation dialogs for destructive actions
- Rebase button shows when behind base branch

**US-206: Worktree cleanup** ✅
- `DELETE /api/tasks/:id/worktree`
- Warns about uncommitted changes
- Force delete option for dirty worktrees
- "Delete Worktree" button in UI
- Archiving task can trigger cleanup

---

## Commits

- `c783429` feat(US-201): project/repo configuration
- `e52aab2` feat(US-202): git fields for code tasks
- `5977acc` feat(US-203,204,205,206): git worktree integration
