# Avenoryn — Private life administration

Avenoryn is a private personal life-administration system for keeping important documents, commitments, purchases, renewals, deadlines, and follow-up actions together.

> Calendar tells you when. Avenoryn tells you what, why, where, and what to do next.

It is a student-built software project and a private system of record. Avenoryn is not a bank, cloud drive, password manager, calendar replacement, or email client.

## Features

- Account registration and login with bcrypt password hashes, signed HTTP-only session cookies, and user-scoped records.
- Private Vault for documents, metadata, download, deletion, and version history.
- Subscriptions, recurring payments, purchases, receipts, warranties, renewals, and deadlines.
- Home Action Center, chronological Timeline, and derived financial commitment summaries by currency.
- Authenticated search across supported records and a Life Inbox for uncategorized private files.
- Optional local OCR and document review. Text extraction works without an AI provider; structured suggestions are optional and require user review and confirmation before they change Avenoryn records.
- Command Center and in-app notifications for upcoming and overdue items.

## Architecture

```text
React + TypeScript + Vite frontend
              │ REST API, HTTP-only cookies
              ▼
Node.js + Express + TypeScript backend ─── PostgreSQL via Prisma
              │
              ├── private local file storage
              └── optional Python + FastAPI OCR/AI service
```

The backend owns authentication, authorization, database access, private files, and writes to domain records. The optional AI service has no database access. The core application works without AI.

## Technology

- Frontend: React, TypeScript, Vite, React Router, Tailwind CSS
- Backend: Node.js 22+, Express, TypeScript, Prisma
- Database: PostgreSQL
- Optional AI service: Python, FastAPI, PyMuPDF, Pillow, pytesseract
- Tests: Node.js test runner, Python `unittest`

## Repository layout

```text
Avenoryn/
  frontend/                 React application
  backend/                  Express API, Prisma schema/migrations, tests
  ai-service/               Optional OCR and structured suggestion service
  private-storage/          Local private files; user contents are ignored by Git
  SRS.md                    Product requirements
  SDD.md                    Architecture and design decisions
  DEVELOPMENT_PLAN.md       Consolidated phase status
  Context.md                Implementation and handoff state
```

## Requirements

- Node.js 22 or newer and npm
- PostgreSQL
- Optional AI/OCR: Python 3.10+; Tesseract OCR executable for image and scanned-PDF OCR
- Optional structured AI suggestions: credentials for a supported OpenAI-compatible provider

## Local setup

### 1. Configure environment files

From the repository root:

```powershell
  if (!(Test-Path backend/.env)) { Copy-Item backend/.env.example backend/.env }
  if (!(Test-Path frontend/.env)) { Copy-Item frontend/.env.example frontend/.env }
  if (!(Test-Path ai-service/.env)) { Copy-Item ai-service/.env.example ai-service/.env }
```

Only copy an example when its `.env` file does not already exist; edit existing files in place. Set `DATABASE_URL` to a dedicated PostgreSQL database and replace `SESSION_SECRET` with a random value. To enable local extraction, use one identical random `AI_SERVICE_TOKEN` in both service files and set `AI_SERVICE_URL=http://127.0.0.1:8000` in `backend/.env`. Provider keys are not needed for local extraction.

Generate a token and session secret in PowerShell without displaying them in this document:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

Environment variable names are documented in the three service example files. The root `.env.example` is a quick reference. Never commit real `.env` files or provider credentials.

### 2. Install backend dependencies and apply migrations

```powershell
cd backend
npm install
npx prisma migrate deploy
npm run dev
```

The API listens on `http://localhost:3001`. Liveness and database readiness are available at `/api/health` and `/api/ready`. Use a separate local database for tests; do not run test setup against a database containing records you need.

### 3. Run the frontend

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`, register an account, and use the authenticated `/app/*` areas. Vite proxies `/api` to the backend during development.

### Optional OCR and AI service

Install Python dependencies in `ai-service` and run FastAPI:

```powershell
cd ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000
```

The AI service provides `/health` and a configuration-aware `/ready` endpoint. Keep the listener bound to `127.0.0.1`; it has no database credentials or database connection.

Set the same `AI_SERVICE_TOKEN` in both `.env` files and `AI_SERVICE_URL=http://127.0.0.1:8000` in the backend file. The FastAPI service binds to loopback only. Install Tesseract OCR for images and scanned PDFs; when it is not on `PATH`, set `TESSERACT_CMD` to the local executable path in `ai-service/.env`. Text-based PDFs use direct extraction. The provider defaults to disabled; extraction still works. Structured suggestions require `AI_PROVIDER=openai_compatible`, `AI_API_KEY`, and `AI_MODEL`. Configure `AI_API_BASE_URL` only for a trusted HTTPS provider (localhost is allowed for development).

### Reliable three-service startup

Use three PowerShell terminals from the repository root. First make sure `backend/.env` and `ai-service/.env` contain the same `AI_SERVICE_TOKEN`, and that the backend has `AI_SERVICE_URL=http://127.0.0.1:8000`. Keep the backend's `DATABASE_URL` pointed at the intended development database. Changes to a service's `.env` take effect only after that service is restarted.

1. **Terminal 1 — database and backend:** start PostgreSQL, then run:

   ```powershell
   cd backend
   npm install
   npx prisma migrate deploy
   npm run dev
   ```

   Wait for the backend to start, then verify `http://localhost:3001/api/ready` reports `"status":"ready"` and `"database":"up"`.

2. **Terminal 2 — local extraction service:**

   ```powershell
   cd ai-service
   .\.venv\Scripts\Activate.ps1
   uvicorn main:app --host 127.0.0.1 --port 8000
   ```

   Wait for `http://127.0.0.1:8000/ready` to respond successfully. This service performs local extraction with no external provider credentials; structured suggestions remain disabled unless explicitly configured.

3. **Terminal 3 — frontend:**

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Open `http://localhost:5173`. To pick up changed backend or AI-service environment values, stop and restart those services; restart Vite too only when its own environment or frontend configuration changed. Restarting does not reset the database or private storage.

Review the AI privacy implications before enabling an external provider: the extracted document text leaves the local service and is sent to that provider. Never use real sensitive documents for public demos or tests.

## Database and files

Prisma schema and committed migrations are under `backend/prisma`. Use `npx prisma migrate deploy` for an existing database. Do not reset a database with data you need. Vault and Inbox file bytes live under the ignored `private-storage/` directory by default; they are served only through authenticated, ownership-checked API routes. Back up the database and private file storage together using a secure process appropriate to your deployment.

## Verification

Run commands from each service directory:

```powershell
# backend
npm test
npm run typecheck
npm run build
npm run prisma:validate
npm run prisma:generate
npm run prisma:deploy

# frontend
npm run typecheck
npm run build

# AI service
python -m unittest -v

# browser E2E (run from frontend; uses the isolated avenoryn_test database)
npm run test:e2e
```

`prisma:deploy` applies pending migrations; use it only against the intended database. The Playwright command starts its own backend and frontend on ports 3002 and 5174, derives `avenoryn_test` from the configured local `backend/.env` URL, and uses synthetic accounts and files. Create and migrate that dedicated test database before running it; never point it at a database containing records you need. Browser screenshots and traces are written under ignored `frontend/test-results/`. Real OCR additionally requires Tesseract. The AI service tests distinguish local extraction from mocked provider failures; no external-provider success is claimed unless valid credentials are configured and a real provider call is made.

## Docker and deployment

No Docker or cloud deployment configuration is included. Run the frontend, backend, PostgreSQL, and optional AI service separately as described above. A production deployment must provide environment secrets through its runtime configuration, use HTTPS, configure `FRONTEND_ORIGIN` and `DATABASE_URL` for that deployment, persist and protect private storage, and back up both database and files. Do not expose private storage as a static directory.

## Security and privacy

- User-scoped queries and ownership checks protect records and files; session cookies are HTTP-only, `SameSite=Lax`, and marked `Secure` in production. State-changing browser requests must match the configured frontend origin.
- Passwords are stored as bcrypt hashes. API errors omit stack traces and database details.
- Uploads are size-limited, checked against allowed extensions/MIME hints and file signatures, and stored under generated keys outside public assets.
- AI is optional. The backend authenticates to the AI service with a shared token and validates returned suggestions; user confirmation is required before saving.
- `.env` files, build outputs, dependency directories, caches, and private-storage contents are excluded from Git. This is not a substitute for reviewing the tracked files before publication.

## Limitations

- The application uses local private file storage; it does not provide managed cloud storage, replication, or automated backups.
- OCR quality depends on document quality and local Tesseract installation. AI suggestions may be incorrect and must be reviewed.
- External AI providers receive document text when configured and used.
- No email delivery, scheduled notification worker, password reset, email verification, MFA, or shared household accounts are included.
- Docker and automated cloud deployment are not included.

## Project status and roadmap

Phases 0–15 are implemented. Phase 16 is the final production-hardening and release phase; this project has no further planned development phase. The exact phase names and release record are in [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) and [Context.md](Context.md).

| Phase | Area | Status |
| --- | --- | --- |
| 0–11 | Foundation through Timeline | Complete |
| 12 | Financial Commitments | Complete |
| 13 | Search + Life Inbox | Complete |
| 14 | AI Intelligence | Complete |
| 15 | Command Center + Notifications | Complete |
| 16 | Production Hardening + Release | Final planned phase |

## Screenshots

Screenshots can be added here when synthetic demo data and a safe capture environment are available. Do not use real personal documents or account data.

## Project documents

- [SRS.md](SRS.md) — product requirements
- [SDD.md](SDD.md) — architecture and design direction
- [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) — implementation phases
- [Context.md](Context.md) — current implementation and release handoff
- [docs/NAME_AVAILABILITY.md](docs/NAME_AVAILABILITY.md) — preliminary name screening and its limitations

## Repository

The existing GitHub repository is currently [github.com/harryfernando10/LifeOS](https://github.com/harryfernando10/LifeOS). Rename it to `Avenoryn` in GitHub repository Settings before changing the clone URL; the local remote still points to the existing repository identity.
