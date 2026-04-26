# 07 — Frontend Integration & Remaining Work

New FSD slices, replacement of the E2B sandbox with a real WebSocket terminal, live canvas resource visualization, and three new pages needed to wire the frontend to the backend.

All code lives in `frontend/src/` and follows Feature-Sliced Design (FSD) rules defined in `.agents/rules/frontend-style.md`.

---

## 7.1 New Layers / Slices to Create

### `shared/api/` — HTTP + WebSocket client

```
shared/api/
├── http-client.ts       # Fetch wrapper with JWT injection, refresh logic
├── ws-client.ts         # WebSocket manager (connect, reconnect, heartbeat)
├── types.ts             # API response types (shared with gateway)
└── index.ts
```

### `entities/lab/` — Lab data model

```
entities/lab/
├── model/lab.ts         # Lab, QuizCheck, SandboxSession types
├── api/lab-api.ts       # getLabs(), getLab(id), startLab(id), submitLab()
├── ui/LabCard.tsx        # Lab listing card component
└── index.ts
```

### `entities/user/model/` — Extend existing user entity

- Add `xp`, `level`, `levelTitle`, `currentStreak` fields
- Add `user-api.ts` for `getMe()`, `updateMe()`

### `entities/submission/` — Submission history

```
entities/submission/
├── model/submission.ts  # Submission, CheckResult types
├── ui/SubmissionCard.tsx
└── index.ts
```

### `features/auth/` — Authentication feature

```
features/auth/
├── model/auth-store.ts  # Zustand store: user, tokens, isAuthenticated
├── api/auth-api.ts      # login(), refresh(), logout()
├── ui/LoginButton.tsx
├── ui/AuthGuard.tsx      # Route wrapper, redirects to login if unauthenticated
└── index.ts
```

### `features/sandbox/` — Sandbox session management

```
features/sandbox/
├── model/sandbox-store.ts  # Active sandbox state, terminal connection status
├── lib/terminal-bridge.ts  # WebSocket ↔ Xterm.js bridge (replace E2B)
├── lib/canvas-sync.ts      # WebSocket → canvas state reducer
└── index.ts
```

---

## 7.2 Key Frontend Changes

### Replace E2B with WebSocket Terminal

Current `TerminalPane.tsx` uses E2B SDK. Replace with:
1. On lab start → call `POST /labs/:id/start` → get `sandboxId`
2. Open WebSocket to `ws://gateway/ws/terminal/{sandboxId}`
3. Pipe Xterm.js input → WS binary frames
4. Pipe WS binary frames → Xterm.js output
5. Send resize events as JSON frames

### Canvas: Live Resource Visualization

Extend `Canvas.tsx` and `workflow.ts` store:
- Add `resource_event` WebSocket subscription via `ws://gateway/ws/canvas/{sandboxId}`
- Map incoming `ResourceEvent` messages to workflow nodes:
  - Pod → node with green/yellow/red accent based on phase
  - Service → node with blue accent
  - Deployment → group node containing pod nodes
- Map `traffic` events to animated edges (dot particles already implemented)
- Auto-layout algorithm: Sugiyama layered layout for DAG positioning

### Lab Left Sidebar: Dynamic Problem Loading

Current `LeftSidebar.tsx` has hardcoded problem content. Replace with:
- Fetch lab details from `GET /labs/:id`
- Render problem description from markdown (use `react-markdown`)
- "Solutions" tab: fetch from `GET /labs/:id/solutions` (locked until attempted)
- "Submissions" tab: fetch from `GET /submissions?labId=:id`

### Auth Integration

- Wrap all routes in `AuthGuard` component
- Add login page at `/login`
- Store tokens in `features/auth/model/auth-store.ts` (Zustand + localStorage)
- Auto-refresh access token when expired

### Daily Tasks: Real API Integration

Current `DailyTasksPage.tsx` uses hardcoded data. Replace with:
- Fetch from `GET /daily-tasks`
- Mark complete via `PATCH /daily-tasks/:taskId`
- Refresh progress widget after task completion

### Progress Page: Real API Integration

- Fetch from `GET /progress` and `GET /progress/streak`
- Live XP bar animation on level-up

---

## 7.3 New Pages

### `/login` — Login Page

- OIDC provider buttons (Google, GitHub)
- Redirect to provider → callback → `POST /auth/login`

### `/labs/:labId` — Lab Detail (pre-start)

- Lab description, estimated time, difficulty
- Previous submission history
- "Start Lab" button → provisions sandbox → redirects to `/labs/:labId/session/:sandboxId`

### `/labs/:labId/session/:sandboxId` — Active Lab Session

- Full-screen lab IDE layout (existing `LabsPage.tsx`)
- Connected to real sandbox via WebSocket
- "Submit" button → calls validation → shows results overlay
