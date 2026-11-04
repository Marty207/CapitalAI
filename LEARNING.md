# FinanceAi — your learning notes

Use this file for **your** notes. The agent won't fill it unless you ask.

## Stack (cheat sheet)

| Layer | Folder / tool | Job |
|-------|----------------|-----|
| Website | `web/` (Next.js) | What you see in the browser |
| API | `backend/` (FastAPI) | Secrets, Plaid, talks to database |
| Database | Supabase Postgres | Stores accounts & transactions |
| Login | Supabase Auth | Email/password; JWT proves who you are |

## Run locally (two terminals)

```bash
# Terminal 1 — API (keep running)
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Terminal 2 — website
cd web && npm run dev
# → http://localhost:3001
```

`web/.env.local` must match the API port: `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1`  
After changing `.env.local`, restart `npm run dev`.

## Sanity checks

```bash
curl http://127.0.0.1:8000/api/v1/health          # API up
curl http://127.0.0.1:8000/api/v1/health/ready    # API + Supabase DB
```

Open http://127.0.0.1:8000/ — should redirect to **FinanceAi** docs (not 404).

## Port 8000 noise

If uvicorn logs `GET /api/aircraft` or `/api/vessels`, that is **another app** (e.g. World Tracker) still calling port 8000. Close that tab or run FinanceAi on a different port and update `NEXT_PUBLIC_API_URL`.

## Database URL

Use the **pooler** connection string from Supabase Dashboard → Database (not always `db.xxx.supabase.co`). Root `.env` → `DATABASE_URL` with `postgresql+asyncpg://`.

## My notes

- 

## Questions I want to understand next

- 
