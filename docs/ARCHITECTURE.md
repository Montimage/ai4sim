# Architecture

## Overview

MMT-Pentester is a full-stack web platform for orchestrating cybersecurity tests and attack simulations. It follows a client–server architecture with real-time communication over WebSocket.

```
Browser (React SPA)
    │
    ├── REST API ──────► Express.js (Node.js)
    │                         │
    └── WebSocket ────────────┤
                              ├── MongoDB (data)
                              ├── Tool processes (Caldera, MAIP, …)
                              └── AI provider (Together AI)
```

## Components

### Frontend (`frontend/`)

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS |
| State | Zustand (global) + MobX (attack store) |
| HTTP | Axios |
| WebSocket | Native WebSocket API |
| Animations | Framer Motion |

Key directories:
- `src/components/views/` — page-level views (Dashboard, Projects, Scenarios, Agent, Reports)
- `src/components/features/` — domain feature components (AttackPanel, Scenarios, Agent)
- `src/store/` — Zustand stores (auth, project, campaign, agent, notifications)
- `src/services/` — API clients and WebSocket service

### Backend (`backend/src/`)

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js + TypeScript |
| Database | MongoDB 5+ via Mongoose |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Real-time | Socket.io + ws |
| Logging | Winston |
| Process mgmt | PM2 (production) |

Key directories:
- `controllers/` — request handlers
- `routes/` — Express router definitions
- `services/` — business logic (AgentOrchestrator, CampaignService, MCPService, …)
- `models/` — Mongoose schemas (User, Project, Campaign, Scenario, …)
- `middleware/` — auth, RBAC, rate limiting
- `websocket/` — WebSocketManager for tool output streaming

### Authentication & RBAC

```
Request → authMiddleware (JWT verify)
              │
              └── requireRole('admin') → requirePermission('manage_users')
```

Roles: `superadmin` > `admin` > `user`

Registration is invite-code gated (`REGISTER_INVITE_CODE` env var).

### Real-time Communication

Two WebSocket channels run in parallel:
- **Socket.io** (`/`) — campaign execution events, scenario state changes
- **ws** (port `WS_PORT`) — raw tool output streaming (MAIP, Caldera, etc.)

### Tool Integration

Each external tool (Caldera, MAIP, Shennina, KNX Fuzzer, GAN Fuzzer) is managed as a child process. The `WebSocketManager` streams stdout/stderr to connected clients in real time. Tools are configured via env vars (`CALDERA_PATH`, `MAIP_PATH`, etc.).

### AI Integration

`MCPService` connects to the MCP (Model Context Protocol) server. `AgentOrchestrator` coordinates autonomous agent runs, feeding tool output to the AI provider (Together AI) for analysis and next-step recommendations.
