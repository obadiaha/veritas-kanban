# Sprint 9: Enhanced Task Templates

**Goal:** Evolve the basic template system (US-603) into a powerful task scaffolding engine with subtasks, variables, multi-task creation, and agent defaults.

**Status:** Complete (8/9 stories, US-907 deferred)

---

## Background

Current templates (Sprint 6, US-603) provide:
- Type, priority, project, description defaults
- Template selector in CreateTaskDialog
- Template management in Settings
- Stored as markdown frontmatter files

**What's missing:**
- Subtask templates (subtasks exist since US-703 but templates can't define them)
- Variable interpolation (descriptions are static text)
- Multi-task templates (one template creates one task)
- Dependency templates (dependencies exist since US-704 but not in templates)
- Agent defaults (can't specify preferred agent per template)
- Template categories (flat list, no grouping)
- Tags in templates
- Apply template to existing task

---

## Stories

| ID | Title | Status | Dependencies | Notes |
|----|-------|--------|--------------|-------|
| US-901 | Enhanced template schema | ✅ Done | None | Extend TaskTemplate type with new fields |
| US-902 | Subtask templates | ✅ Done | US-901 | Templates define pre-built subtask lists |
| US-903 | Variable interpolation | ✅ Done | US-901 | `{{date}}`, `{{project}}`, `{{author}}` in text fields |
| US-904 | Template categories | ✅ Done | US-901 | Group templates by category, filtered UI |
| US-905 | Multi-task templates (blueprints) | ✅ Done | US-901, US-902 | One template creates multiple linked tasks |
| US-906 | Agent & dependency defaults | ✅ Done | US-901 | Templates specify preferred agent and blockedBy |
| US-907 | Apply template to existing task | ⚠️ Deferred | US-901 | Requires TaskDetailPanel refactor - see commit |
| US-908 | Template import/export | ✅ Done | US-901 | JSON export/import for sharing |
| US-909 | Enhanced template UI | ✅ Done | US-901–US-908 | Implemented across previous stories |

---

## Story Details

### US-901: Enhanced Template Schema

Extend `TaskTemplate` to support all new features:

```typescript
interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;          // NEW: "sprint", "bug", "feature", etc.
  version: number;            // NEW: schema version for migration

  taskDefaults: {
    type?: TaskType;
    priority?: TaskPriority;
    project?: string;
    tags?: string[];           // NEW
    descriptionTemplate?: string;
    agent?: AgentType;         // NEW: preferred agent
  };

  // NEW: Pre-defined subtasks
  subtaskTemplates?: SubtaskTemplate[];

  // NEW: For multi-task blueprints
  blueprint?: BlueprintTask[];

  created: string;
  updated: string;
}

interface SubtaskTemplate {
  title: string;              // Supports variables: "Review {{project}} PR"
  order: number;
}

interface BlueprintTask {
  refId: string;              // Local reference for dependency wiring
  title: string;              // Supports variables
  taskDefaults: TaskTemplate['taskDefaults'];
  subtaskTemplates?: SubtaskTemplate[];
  blockedByRefs?: string[];   // References to other BlueprintTask.refIds
}
```

**Acceptance criteria:**
- Backward compatible — existing templates still work
- Migration function for v0 → v1 templates
- Shared types exported from `@veritas-kanban/shared`
- Server validates new schema on save

---

### US-902: Subtask Templates

Templates define subtask lists that auto-create when task is created.

**Example:** "Bug Report" template creates:
- ☐ Reproduce the issue
- ☐ Identify root cause
- ☐ Write fix
- ☐ Add regression test
- ☐ Verify fix in browser

**Acceptance criteria:**
- `subtaskTemplates` field on templates
- Subtasks auto-created when template applied
- Variable interpolation works in subtask titles
- Subtask order preserved
- Template UI allows add/remove/reorder subtasks

---

### US-903: Variable Interpolation

Support dynamic values in description and title templates:

| Variable | Value | Example |
|----------|-------|---------|
| `{{date}}` | Current date (YYYY-MM-DD) | `2026-01-28` |
| `{{datetime}}` | ISO timestamp | `2026-01-28T02:14:33Z` |
| `{{project}}` | Project name from defaults or user input | `veritas-kanban` |
| `{{author}}` | Template user (from config) | `Brad` |
| `{{sprint}}` | Current sprint number (if available) | `9` |
| `{{custom:label}}` | User-prompted value | Dialog asks for `label` |

**Acceptance criteria:**
- Variables replaced at task creation time
- Custom variables prompt user for input via dialog
- Preview shows resolved template before creation
- Unresolved variables highlighted in preview
- Works in title, description, and subtask titles

---

### US-904: Template Categories

Group templates for easier discovery:

**Built-in categories:**
- 🐛 Bug
- ✨ Feature
- 🔄 Sprint
- 📝 Content
- 🔬 Research
- ⚙️ Automation
- 📦 Custom

**Acceptance criteria:**
- `category` field on templates
- Category filter in template picker
- Category selector in template editor
- Category badges/icons in template list
- Uncategorized templates show in "Custom"

---

### US-905: Multi-Task Blueprints

A single "blueprint" template creates multiple linked tasks with dependencies.

**Example:** "New Sprint" blueprint creates:
1. Sprint Planning (no dependencies)
2. Sprint Development (blocked by #1)
3. Sprint Review (blocked by #2)
4. Sprint Retrospective (blocked by #3)

**Acceptance criteria:**
- `blueprint` array field on templates
- Each blueprint task has `refId` for dependency wiring
- `blockedByRefs` maps to `refId` values (resolved to real task IDs on creation)
- All tasks created atomically
- Blueprint creation dialog shows task list preview
- Each blueprint task can have its own subtasks

---

### US-906: Agent & Dependency Defaults

Templates specify preferred agent and dependencies.

**Acceptance criteria:**
- `agent` field in `taskDefaults`
- Agent auto-selected when template applied
- `blockedBy` support for single-task templates (by task title search)
- Agent selector in template editor

---

### US-907: Apply Template to Existing Task

Merge template fields into an existing task (additive, not destructive).

**Acceptance criteria:**
- "Apply Template" button in TaskDetailPanel
- Merge strategy: only fill empty fields (don't overwrite existing values)
- Option to force-overwrite with confirmation
- Subtasks from template appended (not replaced)
- Activity log records template application

---

### US-908: Template Import/Export

Share templates as JSON files.

**Acceptance criteria:**
- Export single template as JSON
- Export all templates as JSON array
- Import from JSON file (drag-and-drop or file picker)
- Duplicate detection (by name)
- Import preview before applying

---

### US-909: Enhanced Template UI

Redesign the template experience:

**Template picker (CreateTaskDialog):**
- Category tabs or sidebar
- Template cards with description preview
- Variable input form (for custom vars)
- Live preview of resolved template
- "Recently used" section

**Template manager (Settings):**
- Full-page template editor (not inline in Settings)
- Subtask list builder (drag to reorder)
- Blueprint task builder (visual dependency wiring)
- Variable preview
- Category assignment
- Import/export buttons

**Acceptance criteria:**
- Template picker replaces current dropdown
- Template editor is a dedicated dialog/page
- Subtask builder with drag-and-drop
- Blueprint builder with visual connections
- Responsive on all screen sizes
