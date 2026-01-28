# Sprint 13: Agent Working/Status Indicator (US-1300)

**Goal:** Add a visual working indicator to the Kanban board so Brad can see at a glance whether Veritas or sub-agents are working, thinking, or idle.

**Priority:** 2
**Parent Feature Request:** task_20260128_eyx3Mw
**Inspiration:** Nate Herk's "Klaus" dashboard (https://www.youtube.com/watch?v=CBNbcbMs_Lc) — colored dot in top-left that goes green when working, gray when idle.

---

## Status States

| State | Color | Animation | Label |
|-------|-------|-----------|-------|
| Idle | Gray (#6b7280) | None (static) | Idle |
| Working | Green (#22c55e) | Pulse | Working... |
| Thinking | Amber (#f59e0b) | Breathe | Thinking... |
| Sub-agents | Blue (#3b82f6) | Ripple + count badge | 2 agents running |
| Error | Red (#ef4444) | Flash once | Error |

---

## Stories

### US-1301: Agent status API endpoint (High)
Server-side service and API for tracking agent activity. GET/POST endpoints with WebSocket broadcast. Auto-reset to idle after timeout.

### US-1302: Animated status indicator component (High)
Visual component for the header. Pulsing dot with color/animation per state. Tooltip with details.

### US-1303: Real-time status hook — useAgentStatus (High)
React hook with WebSocket subscription, polling fallback, stale detection.

### US-1304: Veritas status reporting integration (Medium)
Wire status updates into the task workflow. Pre/post spawn updates, error reporting, heartbeat idle reset.

### US-1305: Status history log (Low)
Track status changes over time. Daily active/idle time calculation. Activity sidebar integration.

### US-1306: Header integration and layout (Medium)
Place indicator in header. Popover with full details. Responsive collapse on narrow screens.

---

## Research Summary

### Nate Herk's Approach (Klaus Dashboard)
- Simple green/gray dot in top-left corner of custom dashboard
- Green = working/thinking, Gray = idle
- Built with Clawdbot/Moltbot, emits status via custom dashboard
- Dashboard tracks deliverables, action log, notes

### Industry Best Practices
- Show clear status label, not just color (accessibility)
- Animate transitions smoothly (no jarring state changes)
- Respect `prefers-reduced-motion` for users who disable animations
- Include detailed tooltip/popover for power users
- Auto-detect stale state (if no update in X minutes, assume idle)

### Design Decision
Going with **pulsing dot + text label** approach — simple like Klaus but with more states and better accessibility. The dot sits in the header next to "Veritas Kanban" title.
