# Deployment

## Prerequisites

- Node.js 20+
- Supabase project (for production storage)
- Upstash Redis (for replay protection in production)
- Vercel or similar Next.js hosting

## Environment Variables

See [`.env.example`](../.env.example) for the complete list. Key production variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only) |
| `PHARMAGUARD_INGEST_KEY` | Yes | HMAC signing key for telemetry |
| `PHARMAGUARD_APP_URL` | Yes | Deployment URL for origin validation |
| `UPSTASH_REDIS_REST_URL` | Recommended | Redis for replay protection |
| `UPSTASH_REDIS_REST_TOKEN` | Recommended | Redis token |
| `NEXT_PUBLIC_URL` | Yes | Deployment URL for server-side fetch |

## Database Setup

1. Create a Supabase project
2. Run the migration in SQL Editor:

```sql
-- File: supabase/migrations/00001_initial_schema.sql
-- Paste and execute the entire file
```

The migration is idempotent — safe to run multiple times.

## Vercel Deployment

1. Push to GitHub
2. Import project in Vercel
3. Set all environment variables from `.env.example`
4. Deploy

## Smoke Tests

After deployment, run smoke tests to verify:

```bash
PHARMAGUARD_SMOKE_BASE_URL=https://your-deployment.vercel.app \
npm run test:smoke
```

Tests verify:
- `/api/health` returns 200 with `application: "ok"`
- `/api/readiness` returns 200 with `store.status: "ok"`
- Homepage returns 200 and contains "BotOps"
- Integration page returns 200 and contains "BotCity"
- `/api/botops/runs` returns 401/403 without auth

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR:

- **TypeScript job**: `npm ci` → `npm test` → `npm run build` (with empty env vars)
- **Python job**: `pip install` → `pytest tests/ -v`

No production dependencies required for CI.
