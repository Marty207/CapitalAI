# CapitalAI

AI-powered personal finance mobile app.

## Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native + Expo + TypeScript |
| Backend | Python + FastAPI |
| Database | PostgreSQL + Supabase |
| Bank connections | Plaid |
| Auth | Supabase Auth |

## Project structure

```
CapitalAI/
├── mobile/          # Expo React Native app
├── backend/         # FastAPI API server
├── supabase/        # Database migrations & local config
└── .env.example     # Environment variable template
```

## Quick start

### 1. Environment

```bash
cp .env.example .env
# Fill in Plaid, Supabase, and database credentials
```

### 2. Database (local Supabase)

```bash
# Install Supabase CLI: https://supabase.com/docs/guides/cli
supabase start
supabase db reset   # applies migrations
```

Or use Alembic directly:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
```

### 3. Backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API docs: http://127.0.0.1:8000/docs  
- Health: `curl http://127.0.0.1:8000/api/v1/health`  
- DB check: `curl http://127.0.0.1:8000/api/v1/health/ready`

Set `DATABASE_URL` in `.env` to your Supabase **pooler** URI (`postgresql+asyncpg://…`).

### 4. Web

```bash
cd web
cp .env.local.example .env.local   # fill Supabase + API URL
npm install
npm run dev
```

Open http://localhost:3001 (see `web/package.json` for port).

### 5. Mobile

```bash
cd mobile
npm install
npx expo start
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/plaid/link-token` | Create Plaid Link token |
| POST | `/api/v1/plaid/exchange-token` | Exchange public token after Link |
| POST | `/api/v1/plaid/sync` | Sync accounts & transactions |
| GET | `/api/v1/accounts` | List linked accounts |
| GET | `/api/v1/transactions` | List transactions |
| GET/POST/PATCH/DELETE | `/api/v1/goals` | Savings goals (Supabase) |
| POST | `/api/v1/capito/chat` | Capito AI assistant (DeepSeek — set `DEEPSEEK_API_KEY`) |

All endpoints except `/health` require a Supabase JWT in the `Authorization: Bearer <token>` header.

## Plaid setup

1. Create a free account at [dashboard.plaid.com](https://dashboard.plaid.com)
2. Copy your **Client ID** and **Sandbox Secret** into `.env`
3. Use sandbox credentials in the Plaid Link flow for testing

## Transaction sync

After linking an account via Plaid Link:

1. `POST /plaid/exchange-token` — stores the access token and runs an initial sync
2. `POST /plaid/sync` — incremental sync using Plaid's `/transactions/sync` cursor API
3. Transactions are stored in PostgreSQL with categories, amounts, and merchant info
# CapitalAI
