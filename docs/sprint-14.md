# Sprint 14: Metrics Refactoring (US-1400)

**Goal:** Fix the broken metrics pipeline by bridging Clawdbot session completions to the Kanban telemetry system. Make dashboard run/token/duration metrics show real data.

**Priority:** 3
**Parent Feature Request:** task_20260128_-RJ73c (originally filed as BUG: Metrics aren't working)

---

## Root Cause (from investigation)

The telemetry system has two layers:

1. **Task lifecycle events** (working ✅) — TaskService emits `task.created`, `task.status_changed`, `task.archived` on every mutation. Dashboard task counts are accurate.

2. **Agent run events** (broken ❌) — The AgentService was designed to emit `run.started`, `run.completed`, `run.tokens` when spawning agent processes directly. But this execution path is **dead code** — all real agent work goes through Clawdbot `sessions_spawn`, which has no integration with the Kanban telemetry system.

**The missing bridge:** Clawdbot sub-agent completion → Kanban telemetry API.

---

## Stories

### US-1401: Telemetry event ingestion endpoint (High)
POST /api/telemetry/events with Zod validation for run.started, run.completed, run.error, run.tokens. WebSocket broadcast.

### US-1402: Veritas telemetry reporter (High)
Shell helper + workflow integration. Emit run events before/after sessions_spawn. Pull token data from session_status.

### US-1403: Metrics service refactor (High)
Verify MetricsService aggregates from real NDJSON data. Add 30d period, per-agent breakdown, streaming reader optimization.

### US-1404: Task-level metrics panel (Medium)
Per-task run history in TaskDetailPanel. Aggregated stats + per-attempt expandable list.

### US-1405: Dashboard metrics cards refresh (Medium)
Real data in all dashboard cards. Trend indicators (up/down vs previous period). Color-coded error rates.

### US-1406: Run badges on Done task cards (Low)
Lightweight run/token/time badges on TaskCard. Batch fetched. Toggle-able.

### US-1407: Cost tracking and budget monitoring (Low)
Per-run cost calculation from model pricing. Monthly totals, budget config, threshold warnings, projected usage.

---

## Data Flow (After Fix)

```
Veritas spawns sub-agent
  → POST /api/telemetry/events { type: "run.started", taskId, agent }
  → Sub-agent works...
  → Sub-agent completes
  → Veritas calls session_status → gets token counts
  → POST /api/telemetry/events { type: "run.completed", taskId, durationMs, success }
  → POST /api/telemetry/events { type: "run.tokens", taskId, inputTokens, outputTokens, cost }
  → MetricsService aggregates from NDJSON
  → Dashboard shows real numbers
```

## Model Pricing (for cost calculation)

| Model | Input | Output | Cache Read |
|-------|-------|--------|------------|
| claude-opus-4-5 | $15/M | $75/M | $1.50/M |
| claude-sonnet-4-5 | $3/M | $15/M | $0.30/M |
