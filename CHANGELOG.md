# Changelog

All notable changes to MMT-Pentester are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] – 2025-09-01

### Added
- Full-stack platform: React 18 + Vite frontend, Node.js + Express backend
- JWT authentication with bcrypt password hashing and session management
- Role-based access control (RBAC): superadmin, admin, user roles
- Invite-code gated registration (`REGISTER_INVITE_CODE` env var)
- Project and campaign management with team-based permissions
- Scenario configuration: sequential and parallel attack execution
- Real-time monitoring via WebSocket (Socket.io + ws)
- Autonomous agent system with MCP (Model Context Protocol) integration
- AI analysis integration (Together AI) for attack result interpretation
- PDF report generation (Puppeteer-based)
- Tool integrations: Caldera, MAIP, Shennina, KNX Smart Fuzzer, GAN Fuzzer, LLM Generator
- Dark/light theme support
- Winston-based structured logging (backend)
- Rate limiting, login lockout, IP-based session tracking

### Security
- Auth middleware on all protected routes
- `GET /api/agents/session/:sessionId` requires authentication
- `POST /api/process-status/batch` requires authentication
- CORS restricted to configured origins via `CORS_ORIGINS` env var

---

## [Unreleased]

### Changed
- Rebrand: ai4sim → MMT-Pentester across entire codebase
- Replace 389 `console.log` debug statements with Winston logger (backend) or removal (frontend)

### Added
- `SECURITY.md` – vulnerability disclosure policy
- `CONTRIBUTING.md` – contribution guide with Conventional Commits convention
- `CODE_OF_CONDUCT.md` – Contributor Covenant v2.1
- Branch protection on `main` (require PR review, no force-push)
- `CHANGELOG.md` (this file)
- `docs/` – architecture, deployment, and development documentation
- `.github/` – issue templates, PR template, Dependabot, CI workflow
- ESLint + Prettier configuration

[1.0.0]: https://github.com/Montimage/ai4sim/releases/tag/v1.0.0
