# Copilot Instructions for this Repository

*(Repository currently empty; these notes serve as a template. Update once code is added.)*

## Overview

This workspace appears to be a web application project. When code is added, the following guidance will help AI assistants get up to speed.

## Architecture & Major Components

- Look for top-level directories such as `src/`, `backend/`, `frontend/`, `api/`, or `services/`. Each directory usually contains a distinct service or layer.
- Entry points are often `index.js`/`main.ts` for frontend and `server.js`/`app.py` for backend.
- Configuration is typically under `config/` or in environment files (`.env`, `config/*.json`).
- Data flows from user requests (e.g. React components) through route handlers/controllers to business logic and finally to a database client or external API.

## Build & Test Workflows

- Common build commands may be defined in `package.json` scripts (`npm run build`, `npm run test`).
- Look for a `Makefile` or `scripts/` directory for additional convenience commands.
- Tests often live in `__tests__/` or alongside source files with `.spec.js`/`.test.ts` suffixes.
- Debugging: the project may use `nodemon` or `ts-node` for live reloading; VS Code launch configurations in `.vscode/launch.json` provide examples.

## Conventions & Patterns

- Naming conventions: functions and files often use camelCase or kebab-case depending on the language.
- API routes typically mirror filesystem structure under `routes/` or `controllers/`.
- Shared utilities are kept in a `utils/` or `lib/` directory.

## Integration Points

- External dependencies are listed in `package.json` (Node) or `requirements.txt` (Python).
- Services communicate via REST, GraphQL, or message queues. Inspect network calls in `src/` or `services/`.
- Look for environment variable usage with `process.env` or `os.environ` that indicate integration configuration.

## AI-Specific Notes

- There is no existing `.github/copilot-instructions.md`; this file serves as the primary guidance.
- Once code is present, update sections above with concrete paths and examples (e.g. "`src/api/users.js` defines user CRUD handlers").

---

Please add actual project files or provide more context so I can refine these instructions with specific examples.