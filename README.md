# Avenoryn — Private Life Administration

**Your personal life, organized. Your next action, clear.**

Avenoryn is a privacy-focused personal life-administration system that brings important documents, recurring commitments, purchases, warranties, renewals, deadlines, and follow-up actions into one place.

> Calendar tells you when. Avenoryn tells you what, why, where, and what to do next.

Built as a student software project, Avenoryn aims to reduce the friction of managing everyday administrative responsibilities through a unified, searchable workspace with document intelligence and actionable reminders.

Avenoryn is not a bank, password manager, cloud-drive replacement, calendar replacement, or email client.

**Repository:** [github.com/harryfernando10/Avenoryn](https://github.com/harryfernando10/Avenoryn)

---

## Table of Contents

- [Features](#features)
- [Application Architecture](#application-architecture)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Requirements](#requirements)
- [Local Installation and Setup](#local-installation-and-setup)
- [Running Avenoryn](#running-avenoryn)
- [Document Intelligence and OCR](#document-intelligence-and-ocr)
- [Testing and Verification](#testing-and-verification)
- [Security and Privacy](#security-and-privacy)
- [Known Limitations](#known-limitations)
- [Development Roadmap](#development-roadmap)
- [Project Documentation](#project-documentation)
- [Project Status](#project-status)

## Features

### 1. Authentication and Access Control
- Account registration and login.
- Bcrypt password hashing.
- Signed HTTP-only session cookies.
- User-scoped records and ownership checks.
- Protected application routes.

### 2. Private Document Vault
- Store important personal and administrative documents.
- Maintain document metadata.
- Upload, download, and delete documents.
- Preserve document version history.
- Access stored files through authenticated, ownership-checked routes.

### 3. Commitments and Recurring Payments
- Track subscriptions and recurring payments.
- Record amounts, billing intervals, and upcoming due dates.
- Review upcoming and overdue commitments.
- Keep financial commitment summaries separate by currency.

### 4. Purchases and Warranties
- Record purchases and associated information.
- Store receipts and purchase documentation.
- Track warranties and related expiry dates.
- Keep purchase records connected to everyday administration.

### 5. Renewals and Deadlines
- Track important renewals and deadlines.
- Organize upcoming administrative obligations.
- Surface items that require attention.

### 6. Action Center and Timeline
- Review important items requiring attention.
- View administrative events chronologically.
- Navigate from an item to its associated record.
- Keep upcoming actions visible instead of relying on memory alone.

### 7. Search and Life Inbox
- Search supported records across the application.
- Capture uncategorized files and administrative notes.
- Upload and inspect Inbox attachments.
- Edit, categorize, dismiss, and associate Inbox items with Vault documents where supported.

### 8. Document Intelligence
- Extract text locally from supported documents.
- Use direct extraction for text-based PDFs.
- Use Tesseract OCR for supported images and scanned PDFs.
- Display extracted text for user review.
- Optionally generate structured document or receipt suggestions through a configured external AI provider.
- Require user review and confirmation before suggestions modify Avenoryn records.

### 9. Command Center and Notifications
- Open the Command Center using `Ctrl + K` or `Cmd + K`.
- Search and navigate using keyboard interactions.
- Access supported commands and application destinations.
- Review in-app notifications for upcoming and overdue items.
- Mark notifications as read individually or collectively.

---

## Application Architecture

Avenoryn uses a modular full-stack architecture. The backend owns authentication, authorization, database access, private file storage, and domain-record updates.

```text
┌──────────────────────────────────────┐
│       React + TypeScript UI          │
│           Vite + Tailwind             │
└──────────────────┬───────────────────┘
                   │
                   │ REST API
                   │ HTTP-only sessions
                   ▼
┌──────────────────────────────────────┐
│       Node.js + Express API           │
│                                      │
│ Authentication • Authorization       │
│ Validation • Domain services         │
└───────────┬──────────────┬───────────┘
            │              │
            ▼              ▼
┌──────────────────┐  ┌──────────────────┐
│ PostgreSQL       │  │ Private local    │
│ Prisma ORM       │  │ file storage     │
└──────────────────┘  └──────────────────┘
            │
            │ Authenticated service request
            ▼
┌──────────────────────────────────────┐
│ Optional Python + FastAPI service    │
│                                      │
│ PDF extraction • Tesseract OCR       │
│ Optional structured AI suggestions   │
└──────────────────────────────────────┘
```

The optional AI service has no database access. It receives authenticated processing requests from the backend and returns extracted text and, when configured, structured suggestions.

The core application does not require an external AI provider. Local document extraction does require the optional FastAPI service to be configured and running.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, React Router, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| ORM and migrations | Prisma |
| Authentication | Bcrypt, signed HTTP-only session cookies |
| OCR and document processing | Python, FastAPI, PyMuPDF, Pillow, pytesseract, Tesseract OCR |
| External AI integration | Optional OpenAI-compatible provider |
| Backend tests | Node.js built-in test runner |
| AI service tests | Python `unittest` |
| Browser automation | Playwright |

## Repository Structure

```text
Avenoryn/
├── ai-service/
│   ├── main.py
│   ├── requirements.txt
│   └── test_main.py
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── package.json
│   └── .env.example
├── private-storage/
├── docs/
│   └── NAME_AVAILABILITY.md
├── .env.example
├── README.md
├── SRS.md
├── SDD.md
├── DEVELOPMENT_PLAN.md
└── Context.md
```

The private-storage directory is used for local file storage. User file contents and environment secrets must not be committed to Git.

---

## Requirements

- Windows, macOS, or Linux.
- Node.js 22 or newer and npm.
- PostgreSQL.
- Python 3.10 or newer for the optional AI service.
- Tesseract OCR for image and scanned-PDF text extraction.
- External AI-provider credentials only if structured AI suggestions are required.

The commands below use Windows PowerShell.

## Local Installation and Setup

### 1. Clone the repository

```powershell
git clone https://github.com/harryfernando10/Avenoryn.git
cd Avenoryn
```

If you already have the repository locally, open PowerShell in the existing project directory instead.

### 2. Configure environment files

Run these commands from the repository root. They copy example files only when the corresponding environment file does not already exist.

```powershell
if (!(Test-Path backend/.env)) {
    Copy-Item backend/.env.example backend/.env
}

if (!(Test-Path frontend/.env)) {
    Copy-Item frontend/.env.example frontend/.env
}

if (!(Test-Path ai-service/.env)) {
    Copy-Item ai-service/.env.example ai-service/.env
}
```

The AI service environment file is needed only if you intend to run that service.

Edit the relevant environment files and configure:

- `DATABASE_URL` — the intended PostgreSQL database.
- `SESSION_SECRET` — a strong, randomly generated secret of at least 32 characters.
- `AI_SERVICE_URL` — `http://127.0.0.1:8000` when enabling local extraction.
- `AI_SERVICE_TOKEN` — the same strong, randomly generated token in both `backend/.env` and `ai-service/.env`.

Generate a random secret in PowerShell using:

```powershell
[Convert]::ToBase64String(
    [Security.Cryptography.RandomNumberGenerator]::GetBytes(48)
)
```

Run this separately for each secret. Use the same generated token in both services for `AI_SERVICE_TOKEN`, but use a different secret for `SESSION_SECRET`.

**Important:** never replace an existing `.env` file blindly. Preserve its current values and edit only the settings that need changing. Never commit real `.env` files or provider credentials.

### 3. Install backend dependencies

```powershell
cd backend
npm install
```

### 4. Configure and migrate PostgreSQL

Ensure PostgreSQL is running and `DATABASE_URL` points to the intended database.

Then run:

```powershell
npx prisma migrate deploy
```

This applies pending migrations to the database selected by `DATABASE_URL`. Verify the database target before running this command. Do not run migrations or destructive test setup against a database containing records you need unless that is the intended target.

### 5. Install frontend dependencies

Open another PowerShell terminal from the repository root:

```powershell
cd frontend
npm install
```

### 6. Install the optional AI service dependencies

For local document extraction, open another PowerShell terminal from the repository root:

```powershell
cd ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Install Tesseract OCR separately and ensure the executable is accessible. If it is not on `PATH`, configure `TESSERACT_CMD` in `ai-service/.env` with the local executable path.

---

## Running Avenoryn

Once dependencies and configuration are set up, use separate PowerShell terminals to run the services.

### Terminal 1 — Backend

Start PostgreSQL first. Then:

```powershell
cd "C:\Projects\Avenoryn\backend"
npm run dev
```

Replace the example path with your actual repository path.

The API listens on:

- `http://localhost:3001`
- Liveness endpoint: `/api/health`
- Database readiness endpoint: `/api/ready`

The readiness endpoint should report a ready application and an available database.

### Terminal 2 — Optional document extraction service

Activate the Python environment and start FastAPI:

```powershell
cd "C:\Projects\Avenoryn\ai-service"
.\.venv\Scripts\Activate.ps1
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

The service provides `/health` and `/ready` endpoints. Keep it bound to loopback for local development.

Local extraction requires the backend and FastAPI service to be correctly configured and running. If you change the backend environment, restart the backend. If you change the AI service environment, restart FastAPI.

### Terminal 3 — Frontend

```powershell
cd "C:\Projects\Avenoryn\frontend"
npm run dev
```

Open:

**http://localhost:5173**

Register an account and use the authenticated application.

Vite proxies API requests to the backend during development.

If you only want to use the core application without local document extraction, you can omit the AI service and its configuration.

Restarting the services does not reset the database or private storage.

---

## Document Intelligence and OCR

Avenoryn separates local text extraction from optional structured AI suggestions.

### Local extraction

- **Text-based PDFs:** text is extracted directly without OCR.
- **Scanned PDFs:** OCR is required.
- **JPEG, PNG, and WEBP images:** OCR is required.

Image and scanned-PDF OCR depend on Tesseract being installed and correctly configured.

### Structured AI suggestions

Structured suggestions are disabled by default. To enable them, configure the supported OpenAI-compatible provider in `ai-service/.env`:

- `AI_PROVIDER=openai_compatible`
- `AI_API_KEY`
- `AI_MODEL`

Configure `AI_API_BASE_URL` only for a trusted HTTPS provider, except for explicitly permitted local development endpoints.

When structured suggestions are requested, extracted document text is sent to the configured external provider. Review the provider's privacy and data-handling policies before enabling this feature.

Avenoryn validates returned suggestions and requires user confirmation before saving them. AI-generated information can be incorrect and should always be reviewed.

No external-provider success is claimed unless a real provider call has been performed and verified.

## Testing and Verification

Run commands from the relevant service directory.

### Backend

```powershell
cd backend
npm test
npm run typecheck
npm run build
npm run prisma:validate
npm run prisma:generate
```

To apply migrations:

```powershell
npm run prisma:deploy
```

Only run migration commands against the intended database.

### Frontend

```powershell
cd frontend
npm run typecheck
npm run build
```

### AI service

```powershell
cd ai-service
python -m unittest -v
```

Real OCR tests require Tesseract and the relevant image/PDF dependencies.

### Playwright browser tests

Run from the frontend directory:

```powershell
cd frontend
npm run test:e2e
```

The Playwright setup uses a separate `avenoryn_test` database and starts its own backend and frontend on ports 3002 and 5174. Create and migrate the dedicated test database before running E2E tests.

The test setup derives the test database name from the configured local backend database URL. Verify the configuration and database target before running tests. Never run test setup against a database containing records you need.

Playwright screenshots and traces are written under the ignored `frontend/test-results/` directory.

### Verified release checks

The recorded release verification includes:

- Backend: **78 passed, 0 failed, 0 skipped**, across 14 suites.
- AI service: **13 passed, 0 failed**, including real local Tesseract OCR on synthetic image and scanned-PDF inputs.
- Frontend and backend typechecks/builds: passed.
- Prisma schema validation and migration status: passed; all five migrations were current.
- Prisma Client generation: succeeded in a clean temporary installation with aligned Prisma 6.12.0 packages.
- Playwright: **2 passed, 0 failed**, across desktop and 390px mobile runs.
- `npm audit`: zero vulnerabilities at the time of the recorded check.
- `git diff --check` and the staged secret/artifact audit: passed.

The Playwright scenarios covered multiple core workflows, including authentication, protected routes, Vault operations, commitments, purchases/warranties, renewals/deadlines, Inbox triage and persistence, search, notifications, Command Center interactions, and cross-user document access. The recorded browser suite did not exercise AI review/confirmation end to end or fully assert Timeline and financial summary values.

These results describe the recorded verification run, not a guarantee that every possible input or environment has been tested.

---

## Security and Privacy

Avenoryn is designed with several safeguards:

- Passwords are stored as bcrypt hashes.
- Session cookies are HTTP-only and use `SameSite=Lax`; production cookies are marked `Secure`.
- User-scoped queries and ownership checks protect records and files.
- State-changing browser requests must match the configured frontend origin.
- Uploads are size-limited and validated against permitted file types and signatures.
- Stored files use generated keys and are not served from public static directories.
- The backend authenticates to the optional AI service using a shared token.
- AI suggestions are validated and require user confirmation.
- Environment files, dependency directories, build outputs, caches, and private-storage contents are excluded from Git.

For public demonstrations and testing, use synthetic accounts and documents. Never commit or expose real personal documents, provider credentials, session secrets, or private files.

Local private storage does not provide managed replication or automated backups. Back up the database and private files together using a secure process appropriate to your deployment.

## Known Limitations

- File storage is local; managed cloud storage, replication, and automated backups are not included.
- OCR quality depends on document quality and Tesseract configuration.
- Structured AI suggestions require an explicitly configured external provider and may be incorrect.
- External AI providers receive extracted document text when configured and used.
- Live external AI-provider behavior has not been verified as part of the recorded release checks.
- Email delivery and a scheduled notification worker are not included.
- Password reset, email verification, multi-factor authentication, and shared household accounts are not included.
- Docker and automated cloud deployment configuration are not included.
- Browser testing covers representative workflows rather than every possible interaction.

---

## Development Roadmap

Avenoryn was developed in **17 numbered phases, from Phase 0 through Phase 16**. Each phase represents a distinct part of the implementation.

| Phase | Name | Status |
|---:|---|---|
| 0 | Project Initialization | Complete |
| 1 | Design System and Application Shell | Complete |
| 2 | Database and Backend Foundation | Complete |
| 3 | Authentication and Authorization | Complete |
| 4 | Core Data Model | Complete |
| 5 | Vault and Documents | Complete |
| 6 | Document Versioning | Complete |
| 7 | Commitments | Complete |
| 8 | Purchases and Warranties | Complete |
| 9 | Renewals and Deadlines | Complete |
| 10 | Action Center | Complete |
| 11 | Timeline | Complete |
| 12 | Financial Commitments | Complete |
| 13 | Search and Life Inbox | Complete |
| 14 | AI Document Intelligence | Complete |
| 15 | Command Center and Notifications | Complete |
| 16 | Production Hardening and Release | Complete |

The original development phases are complete, and the release is published. The roadmap is retained for traceability rather than as a list of planned features.

For detailed implementation history, requirements, architecture decisions, and release notes, see the project documentation below.

## Project Documentation

- [SRS.md — Software Requirements Specification](https://github.com/harryfernando10/Avenoryn/blob/master/SRS.md)
- [SDD.md — Software Design Document](https://github.com/harryfernando10/Avenoryn/blob/master/SDD.md)
- [DEVELOPMENT_PLAN.md — Development Roadmap](https://github.com/harryfernando10/Avenoryn/blob/master/DEVELOPMENT_PLAN.md)
- [Context.md — Implementation Context and Release Handoff](https://github.com/harryfernando10/Avenoryn/blob/master/Context.md)
- [docs/NAME_AVAILABILITY.md — Preliminary Name Screening](https://github.com/harryfernando10/Avenoryn/blob/master/docs/NAME_AVAILABILITY.md)

## Repository

**GitHub:** [github.com/harryfernando10/Avenoryn](https://github.com/harryfernando10/Avenoryn)

Avenoryn is a student-built software project intended to demonstrate full-stack engineering, secure data handling, document processing, and practical personal administration workflows.
