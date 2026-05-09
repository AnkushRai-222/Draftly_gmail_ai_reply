# Draftly — Gmail AI Reply Agent

> AI-powered backend + frontend that reads your Gmail, generates smart reply drafts, and sends them only after your approval.

---

## Project Structure

```
draftly/
├── backend/          # Node.js + Express + Prisma
└── frontend/         # React + Vite
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Redis instance
- Google Cloud project (Gmail API + OAuth2)
- OpenRouter API key (free): https://openrouter.ai/keys
- Google Gemini API key (free): https://aistudio.google.com/app/apikey

---

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in all values in .env (see below)

npm install
npx prisma db push        # Create DB tables
npx prisma generate       # Generate Prisma client
npm run dev               # Start dev server on :5000
```

#### Required .env values

| Variable | Where to get it |
|----------|----------------|
| `DATABASE_URL` | Your PostgreSQL connection string |
| `REDIS_URL` | Your Redis connection string |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → OAuth2 credentials |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → OAuth2 credentials |
| `GOOGLE_CALLBACK_URL` | `http://localhost:5000/auth/google/callback` |
| `ENCRYPTION_KEY` | Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_SECRET` | Any long random string (32+ chars) |
| `OPENROUTER_API_KEY` | https://openrouter.ai/keys |
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey |

#### Google Cloud Setup
1. Go to https://console.cloud.google.com/
2. Create a new project
3. Enable **Gmail API** and **Google+ API**
4. Create OAuth2 credentials (Web application)
5. Add Authorized redirect URI: `http://localhost:5000/auth/google/callback`
6. Add test users in OAuth consent screen (while in testing mode)

---

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev     # Start dev server on :5173
```

The Vite dev server automatically proxies `/api` and `/auth` to `http://localhost:5000`.

---

## All API Endpoints

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/auth/google` | Start OAuth flow |
| GET | `/auth/google/callback` | OAuth callback → JWT |
| GET | `/auth/me` | Get current user |
| POST | `/auth/logout` | Revoke token + logout |

### Emails
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/emails` | Fetch & sync emails (`?refresh=true` to force) |
| GET | `/api/emails/:id` | Get single email |
| POST | `/api/emails/:id/skip` | Manually filter out |

### Drafts
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/drafts/generate` | `{ emailId, tone? }` — Generate AI draft |
| GET | `/api/drafts` | List drafts `?status=pending\|approved\|sent` |
| GET | `/api/drafts/:id` | Get draft |
| PATCH | `/api/drafts/:id` | Edit `{ content?, tone? }` |
| POST | `/api/drafts/:id/approve` | Approve draft |
| POST | `/api/drafts/:id/reject` | Reject draft |
| POST | `/api/drafts/:id/send` | Send approved draft |
| POST | `/api/drafts/:id/regenerate` | Re-generate `{ tone? }` |
| GET | `/api/drafts/logs` | Sent history |
| GET | `/api/drafts/queue-stats` | BullMQ queue monitor |

### Preferences & Filters
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/preferences` | Get preferences |
| PUT | `/api/preferences` | Update tone, signature, etc. |
| GET | `/api/preferences/filters` | Get filter rules |
| POST | `/api/preferences/filters` | Add filter rule |
| DELETE | `/api/preferences/filters/:id` | Remove filter rule |

### Style
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/style` | Get style profile |
| POST | `/api/style/learn` | Trigger re-analysis `?force=true` |

---

## How It Works

```
User logs in via Google OAuth2
        ↓
Draftly fetches Gmail inbox
        ↓
Email filter pipeline runs
  - System filters: OTP, promo, bulk mail, noreply
  - User-defined: allow/skip rules
        ↓
Actionable emails shown in dashboard
        ↓
User clicks "Generate Draft"
        ↓
AI Orchestrator builds prompt with:
  - Email content + thread context
  - User's style profile (from sent emails)
  - Preferred tone + signature
        ↓
OpenRouter (Llama 3.3 / DeepSeek) → auto-failover to Gemini 1.5 Flash
        ↓
Draft saved with status: pending
        ↓
User reviews → Edit / Approve / Reject / Regenerate
        ↓
Approved → "Send" → BullMQ queue → Gmail API
  - RFC 2822 encoded with In-Reply-To + References headers
  - Retry ×3 on failure (exponential backoff: 5s → 25s → 125s)
  - Idempotency: draftId as jobId prevents double-sends
```

---

## Draft Status Flow

```
pending  →  approved  →  sent
   ↓            ↓           
 edited      rejected     failed (retried)
   ↓
 approved
```

---

## Deployment (Render)

**Live Demo:** [Draftly - Gmail AI Reply Agent](https://draftly-frontend-csyd.onrender.com/)

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend runtime | Node.js + Express |
| Database | PostgreSQL + Prisma ORM |
| Cache / Queue | Redis + BullMQ |
| Auth | Google OAuth2 + Passport.js + JWT |
| Gmail | googleapis (official SDK) |
| AI Primary | OpenRouter (Llama 3.3 70B free) |
| AI Fallback | Google Gemini 1.5 Flash |
| Token security | AES-256-GCM encryption |
| Frontend | React + Vite + React Router |
| Logging | Winston |

---
