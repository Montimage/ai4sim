# Contributing to MMT-Pentester

Thank you for your interest in contributing! This document outlines how to get involved.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

## How to Contribute

### Reporting Bugs

Open an issue using the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md). Include:
- A clear description of the problem
- Steps to reproduce
- Expected vs. actual behaviour
- Environment details (OS, Node.js version, browser)

### Suggesting Features

Open an issue using the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).

### Submitting Code

1. Fork the repository
2. Create a feature branch from `main` (see Branching Strategy below)
3. Make your changes following the coding standards
4. Run the build to verify nothing is broken
5. Open a pull request using the [PR template](.github/PULL_REQUEST_TEMPLATE.md)

## Development Setup

### Prerequisites

- Node.js 18+
- MongoDB 5.0+
- npm 9+

### Getting started

```bash
git clone https://github.com/Montimage/mmt-pentester.git
cd mmt-pentester
npm run install:all

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your local values

# Start in development mode
npm run dev
```

The backend runs on `http://localhost:3000` and the frontend on `http://localhost:5173`.

## Branching Strategy

| Branch type | Pattern | Example |
|-------------|---------|---------|
| Feature | `feat/<short-description>` | `feat/report-export` |
| Bug fix | `fix/<short-description>` | `fix/websocket-reconnect` |
| Chore / docs | `chore/<description>` | `chore/update-dependencies` |

Always branch from `main`. Keep branches focused — one concern per PR.

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
```
feat(auth): add invite-code registration gate
fix(agent): resolve session endpoint missing auth middleware
docs(readme): update installation steps for Node 20
```

## Pull Request Process

1. Fill in the PR template completely
2. Ensure the build passes: `npm run build`
3. Describe what was changed and why
4. Request a review from a maintainer
5. Address review comments promptly

PRs are squash-merged to keep the history clean.

## Coding Standards

### TypeScript

- Strict mode enabled — no `any` unless unavoidable
- Prefer `const` over `let`; avoid `var`
- Name functions and variables descriptively
- No commented-out code in committed files

### Backend

- All routes require authentication (`authMiddleware`) unless explicitly public
- Use Winston logger for server-side logging — no `console.log` in production paths
- Validate all external input at route boundaries

### Frontend

- Use Zustand stores for shared state
- Keep components focused; extract logic to hooks or services
- No `console.log` debug statements in committed code

## Security

If you discover a security vulnerability, **do not open a public issue**. See [SECURITY.md](SECURITY.md) for the responsible disclosure process.
