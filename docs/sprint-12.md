# Sprint 12: LAN Access for Veritas Kanban (US-1200)

**Goal:** Make the Veritas Kanban board accessible from any device on the local network while blocking internet access.

**Priority:** 1 (Highest of the three feature requests)
**Parent Feature Request:** task_20260128_Nvw1ZN

---

## Stories

### US-1201: Bind Vite dev server to LAN (High)
Configure `vite.config.ts` with `host: true` and HMR for LAN access.

### US-1202: Bind Express API server to LAN (High)
Update `server.listen()` to bind `0.0.0.0`, verify WebSocket works over LAN.

### US-1203: Configure CORS for LAN origins (High)
Allow cross-origin requests from private network ranges only (10.x, 192.168.x, 172.16-31.x). Block public IPs.

### US-1204: macOS firewall configuration guide (Medium)
Provide setup/teardown scripts for `pf` firewall rules restricting ports 3000-3001 to LAN only.

### US-1205: Auto-detect and display LAN URL (Low)
Detect LAN IP via `os.networkInterfaces()`, show in server banner and UI with copy-to-clipboard.

### US-1206: Responsive design audit for tablets/phones (Low)
Audit and fix layout for tablet (768-1024px) and phone (320-480px) viewports. Touch-friendly interactions.

---

## Technical Notes

- Current state: Both Vite and Express bind to `localhost` only
- Vite: Add `host: true` to `server` config in `vite.config.ts`
- Express: Change `server.listen(PORT)` → `server.listen(PORT, '0.0.0.0')`
- CORS: Use `cors` middleware with origin whitelist for private ranges
- Firewall: macOS `pf` rules to block non-LAN traffic to ports 3000/3001
- LAN IP: `10.0.0.247` (Brad's Mac mini)
