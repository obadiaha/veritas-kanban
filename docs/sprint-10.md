# Sprint 10: Metrics & Observability Expansion

**Goal:** Capture real agent run metrics and surface them per-task and on the dashboard. Move from simulated data to actual telemetry from Clawdbot/Veritas sub-agent runs.

**Status:** Planning

---

## Background

Sprint 8 built the telemetry foundation (event logging, metrics API, dashboard). Current gaps:
- Only simulated/test data — no real agent run metrics captured
- No per-task metrics view (can't see run stats when viewing a completed task)
- No integration with Clawdbot session data (tokens, cost, duration)
- Dashboard shows aggregate only, no drill-down

---

## Stories

| ID | Title | Status | Dependencies | Notes |
|----|-------|--------|--------------|-------|
| US-1001 | Veritas telemetry reporter | ⏳ Todo | None | Veritas emits telemetry events after sub-agent work |
| US-1002 | Task metrics panel | ⏳ Todo | None | Per-task metrics in TaskDetailPanel for completed tasks |
| US-1003 | Agent run summary on task card | ⏳ Todo | US-1002 | Show run count, success rate, total time on card |
| US-1004 | Token & cost tracking integration | ⏳ Todo | US-1001 | Pull session usage from Clawdbot, emit run.tokens events |
| US-1005 | Dashboard drill-down | ⏳ Todo | US-1002 | Click dashboard metrics to see per-project/per-task breakdown |
| US-1006 | Metrics export | ⏳ Todo | US-1002 | Export task/project metrics as CSV or JSON |
| US-1007 | Historical trends | ⏳ Todo | US-1001 | Charts showing metrics over time (runs/day, success rate trend) |
| US-1008 | Agent comparison | ⏳ Todo | US-1001 | Which agent is fastest/cheapest/most reliable per task type |
| US-1009 | Failure alerts to Teams | ⏳ Todo | US-1001 | Auto-notify Tasks channel when a run fails |
| US-1010 | Daily digest | ⏳ Todo | US-1001 | Morning summary of yesterday's work sent to Teams |
| US-1011 | Cost budget tracking | ⏳ Todo | US-1004 | Monthly token budget with burn rate on dashboard |
| US-1012 | Sprint velocity | ⏳ Todo | US-1007 | Tasks completed per sprint, velocity trend chart |

---

## Story Details

### US-1001: Veritas Telemetry Reporter

After a sub-agent completes work on a kanban task, Veritas emits telemetry events to the board's API.

**Flow:**
1. Sub-agent spawned for a kanban task
2. Sub-agent completes (or fails)
3. Veritas (main session) emits:
   - `run.started` (taskId, agent, timestamp)
   - `run.completed` or `run.error` (durationMs, success, exitCode)
   - `run.tokens` (inputTokens, outputTokens, totalTokens, model, cost)

**Data sources:**
- Clawdbot `session_status` → token usage, model, cost
- Spawn timestamp → start time
- Completion timestamp → end time, duration
- Sub-agent result → success/failure

**Acceptance criteria:**
- Veritas emits telemetry for every sub-agent task completion
- Events include accurate duration, token counts, and cost
- Works for all agent types (Claude Code, Amp, Copilot, Gemini)
- Emits to `POST /api/telemetry/events` (new endpoint)
- Backward compatible with existing telemetry data

---

### US-1002: Task Metrics Panel

Show run metrics when viewing a completed task in TaskDetailPanel.

**Display:**
- Total runs (attempts)
- Success rate (% of successful runs)
- Total duration (sum of all run durations)
- Token usage (input, output, total across all runs)
- Estimated cost (if available)
- Last run details (agent, duration, status)
- Error summary (if any failures)

**Acceptance criteria:**
- New "Metrics" tab or section in TaskDetailPanel
- Only shows for tasks with telemetry data
- Fetches via `GET /api/telemetry/events?taskId={id}`
- Aggregates across all attempts
- Shows per-attempt breakdown in expandable list

---

### US-1003: Agent Run Summary on Task Card

Show lightweight metrics on task cards in Done column.

**Display:**
- Run count badge (e.g., "3 runs")
- Success indicator (green check / red x)
- Total time badge (e.g., "45m")

**Acceptance criteria:**
- Compact indicators on TaskCard for done tasks
- Fetched in batch (not per-card API calls)
- Tooltip with more detail on hover
- Optional — can be toggled off in settings

---

### US-1004: Token & Cost Tracking Integration

Pull real token/cost data from Clawdbot sessions.

**Data flow:**
1. After sub-agent completes, call `session_status` for the sub-agent session
2. Extract: totalTokens, input/output split, model, cost
3. Emit `run.tokens` event to telemetry

**Acceptance criteria:**
- Accurate token counts from actual Clawdbot sessions
- Cost calculation based on model pricing
- Stored per-attempt for historical tracking
- Works even if Clawdbot session expires (best-effort)

---

### US-1005: Dashboard Drill-Down

Click metrics on the dashboard to see breakdowns.

**Interactions:**
- Click "Total Tasks" → filtered task list
- Click "Error Rate" → list of failed runs with task links
- Click "Token Usage" → per-project token breakdown
- Click "Run Duration" → per-project duration breakdown

**Acceptance criteria:**
- Clickable metric cards on dashboard
- Drill-down views with back navigation
- Filter by project, date range
- Links to individual tasks

---

### US-1006: Metrics Export

Export metrics data for reporting.

**Formats:**
- CSV (for spreadsheets)
- JSON (for programmatic use)

**Scope:**
- Per-task export
- Per-project export
- Full export (all telemetry)

**Acceptance criteria:**
- Export button on dashboard and task metrics panel
- Date range filter
- Download as file
- Includes all relevant fields (task, agent, duration, tokens, cost)

---

### US-1007: Historical Trends

Line/bar charts showing metrics over time.

**Charts:**
- Runs per day (bar chart)
- Success rate over time (line chart)
- Token usage trend (stacked area chart)
- Average run duration trend (line chart)

**Acceptance criteria:**
- Chart section on dashboard (below current metrics)
- 7-day and 30-day views
- Responsive charts (works on narrow screens)
- Uses lightweight chart library (recharts or similar)
- Auto-refreshes with dashboard

---

### US-1008: Agent Comparison

Compare agent performance across task types.

**Display:**
- Table: Agent × Task Type → avg duration, success rate, avg tokens
- "Best agent for..." recommendations
- Highlight cheapest, fastest, most reliable per category

**Acceptance criteria:**
- New section on dashboard (collapsible)
- Aggregates from telemetry events by agent + task type
- Minimum 3 runs required for comparison (avoid noise)
- Sortable by metric (speed, cost, reliability)
- Tooltip explaining the recommendation logic

---

### US-1009: Failure Alerts to Teams

Auto-notify Tasks channel when an agent run fails.

**Flow:**
1. `run.error` or `run.completed` with `success: false` telemetry event
2. Server emits notification to configured Teams channel
3. Message includes: task title, agent, error summary, link to task

**Acceptance criteria:**
- Notification sent within 30s of failure event
- Uses existing notification infrastructure
- Configurable: on/off in settings
- Deduplicates (don't spam for same task retries)
- Includes actionable info (what failed, which task)

---

### US-1010: Daily Digest

Morning summary sent to Teams with yesterday's stats.

**Content:**
- Tasks completed / created / in progress
- Agent runs: total, success rate
- Token usage: total, by agent
- Top accomplishments (recently done tasks)
- Any failures or blocked items

**Acceptance criteria:**
- Scheduled via cron (configurable time, default 8:00 AM CT)
- Sent to Tasks channel
- Skips if no activity (don't send empty digests)
- Covers previous 24 hours
- Clean formatting for Teams

---

### US-1011: Cost Budget Tracking

Set monthly token budget and track burn rate.

**Features:**
- Budget setting in Settings dialog (monthly token limit)
- Burn rate calculation (tokens/day average)
- Projected monthly usage
- Warning threshold (e.g., 80% of budget)
- Dashboard card showing: used / budget, projected, status (on track / over)

**Acceptance criteria:**
- Budget stored in app config
- Dashboard card with progress bar
- Color coding: green (< 60%), yellow (60-80%), red (> 80%)
- Projected overage warning
- Historical budget vs actual chart (pairs with US-1007)

---

### US-1012: Sprint Velocity

Track task completion rate per sprint.

**Display:**
- Bar chart: tasks completed per sprint
- Rolling average line overlay
- Sprint-over-sprint comparison
- Velocity trend (accelerating / steady / slowing)

**Acceptance criteria:**
- Sprint boundaries detected from sprint docs or configurable dates
- Chart on dashboard (in historical trends section)
- Includes all task types
- Breakdown by type available on hover
- Shows current sprint progress vs average
