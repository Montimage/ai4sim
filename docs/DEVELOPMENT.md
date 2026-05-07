# Development Guide

## Quick Start

```bash
git clone https://github.com/Montimage/ai4sim.git
cd ai4sim
npm run install:all
cp backend/.env.example backend/.env
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Default login: `admin` / `admin123456`

## Project Structure

```
ai4sim/
├── frontend/           # React 18 + Vite SPA
│   └── src/
│       ├── components/ # UI components (views/, features/)
│       ├── store/      # Zustand state stores
│       ├── services/   # API + WebSocket clients
│       ├── hooks/      # Custom React hooks
│       └── utils/      # Shared utilities (logger, etc.)
├── backend/            # Node.js + Express API
│   └── src/
│       ├── controllers/
│       ├── routes/
│       ├── services/
│       ├── models/     # Mongoose schemas
│       ├── middleware/ # auth, RBAC, rate limiting
│       ├── websocket/
│       ├── utils/      # logger, helpers
│       └── scripts/    # CLI admin scripts
├── tools/              # Integrated security tools
├── docs/               # This directory
└── .github/            # CI, templates, Dependabot
```

## Available Scripts

```bash
npm run dev              # Start backend + frontend concurrently
npm run dev:backend      # Backend only (nodemon, hot-reload)
npm run dev:frontend     # Frontend only (Vite HMR)
npm run build            # Build both for production
npm run install:all      # Install all workspace dependencies

# Admin scripts (backend/)
npm run init-super-admin # Create/reset superadmin account
npm run reset-users      # Reset all users
```

## Environment Variables

See `backend/.env.example` for the full reference. Key vars for development:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/mmt-pentester
JWT_SECRET=dev-secret-change-in-production
REGISTER_INVITE_CODE=dev-invite
CORS_ORIGINS=http://localhost:5173
DEBUG_MODE=false
```

## Logging

**Backend**: Winston logger at `backend/src/utils/logger.ts`.

```typescript
import { logger } from '../utils/logger';
logger.info('Something happened');
logger.error('Something failed', err);
```

Do not use `console.log` in production paths — the `no-console` ESLint rule will flag it.

**Frontend**: Logger utility at `frontend/src/utils/logger.ts`.

```typescript
import { logger } from '../utils/logger';
logger.debug('Only shown in dev mode');
logger.error('Shown always', err, /* showNotification */ true);
```

## Coding Standards

- **No `console.log`** in committed code — use the logger utilities above
- **Strict TypeScript** — no `any` unless absolutely necessary
- **Conventional Commits** — `feat:`, `fix:`, `chore:`, `docs:`, etc.
- **Auth on all routes** — new routes must include `authMiddleware`; add `requireRole` for admin-only endpoints

## Adding a New Route

1. Create controller in `backend/src/controllers/`
2. Create router in `backend/src/routes/`, apply `authMiddleware`
3. Register in `backend/src/server.ts`
4. Add API types in `frontend/src/services/`

## Debugging

Backend logs write to `backend/server.log` and `backend/error.log`.

WebSocket messages can be inspected in browser DevTools → Network → WS.

MongoDB: connect with `mongosh mongodb://localhost:27017/mmt-pentester`.
