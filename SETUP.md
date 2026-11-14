# Setup Guide — SMS Dispatcher

This guide walks through creating a **new Supabase project**, wiring secrets, running migrations, and deploying the cron job.

---

## 1. Create a New Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**
2. Choose organization, name it (e.g., `sms-dispatcher-prod`), set a strong DB password
3. Wait for provisioning (2–3 min)
4. Note down:
   - **Project URL** → `SUPABASE_URL`
   - **Service Role Key** (Settings → API) → `SUPABASE_SERVICE_ROLE_KEY`
   - **Anon/Public Key** → `SUPABASE_ANON_KEY` (used by Lovable client)

---

## 2. Run Database Migrations

In the new project's **SQL Editor**, run the two migration files **in order**:

```sql
-- 1️⃣ First: drizzle/migrations/0000_migration.sql
-- (Copy-paste the entire file content)
```

```sql
-- 2️⃣ Then: drizzle/migrations/0001_migration.sql
-- (Copy-paste the entire file content)
```

These create:
- `recipients` table
- `sms_messages` table with status enum, indexes, RLS policies
- `claim_due_sms(_limit)` — atomic claim with `FOR UPDATE SKIP LOCKED`
- `timeout_stuck_sms()` — marks stale `sending` → `failed` after 10 min
- Domain allowlist trigger on `auth.users` (`@samuel-berthe.fr`, `@explorethevault.ai`)

Verify in **Table Editor** that both tables exist and RLS is enabled.

---

## 3. Configure httpSMS Provider

1. Sign up at [httpsms.com](https://httpsms.com)
2. Create an API key
3. Note your **Sender ID** (or use a verified number)
4. Set these as secrets (next step):
   - `HTTPSMS_API_KEY`
   - `HTTPSMS_FROM`

---

## 4. Set Environment Variables

### Local Development (`.env`)

Copy `.env.dist` → `.env` and fill in:

```bash
# Supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_ANON_KEY=<anon-key>

# httpSMS
HTTPSMS_API_KEY=<your-httpsms-api-key>
HTTPSMS_FROM=<your-sender-id>

# Cron auth (generate a random 32+ char string)
LOVABLE_CRON_SECRET=<openssl rand -base64 32>
# LOVABLE_CRON_SECRET_PREVIOUS=  # optional, for key rotation
```

### Production (Lovable Cloud / Vercel / Your Host)

Add the **same variables** as secrets in your hosting platform:

| Platform | Where |
|----------|-------|
| Lovable Cloud | Project → Settings → Environment Variables |
| Vercel | Project → Settings → Environment Variables |
| Netlify | Site → Settings → Environment Variables |
| Docker / VPS | `.env` file or orchestrator secrets |

**Never commit real secrets to git.**

---

## 5. Deploy the Cron Job

The dispatcher runs via a **POST endpoint** that must be called every minute.

### Endpoint

```
POST https://<your-domain>/api/public/jobs/dispatch-due-sms
Authorization: Bearer <LOVABLE_CRON_SECRET>
Content-Type: application/json
```

### Option A: Vercel Cron (if hosted on Vercel)

Create `vercel.json` at repo root:

```json
{
  "crons": [
    {
      "path": "/api/public/jobs/dispatch-due-sms",
      "schedule": "* * * * *"
    }
  ]
}
```

Vercel automatically sends the `Authorization: Bearer <LOVABLE_CRON_SECRET>` header if you add `LOVABLE_CRON_SECRET` as a Vercel Environment Variable.

### Option B: GitHub Actions

`.github/workflows/dispatch-sms.yml`:

```yaml
name: Dispatch Due SMS
on:
  schedule:
    - cron: '* * * * *'
jobs:
  dispatch:
    runs-on: ubuntu-latest
    steps:
      - name: Call dispatch endpoint
        run: |
          curl -X POST "https://<your-domain>/api/public/jobs/dispatch-due-sms" \
            -H "Authorization: Bearer ${{ secrets.LOVABLE_CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

Add `LOVABLE_CRON_SECRET` in GitHub repo Settings → Secrets → Actions.

### Option C: External Scheduler (cron-job.org, EasyCron, etc.)

Point any cron service to the endpoint with the Bearer token header.

---

## 6. Verify It Works

1. **Start locally:**
   ```bash
   npm install
   npm run dev
   ```
   Opens at `http://localhost:5173` (or whatever Vite prints).

2. **Sign in** with an allowed email (`@samuel-berthe.fr` or `@explorethevault.ai`).

3. **Create a recipient** → **Schedule an SMS** for 1–2 minutes in the future.

4. **Trigger the cron manually** to test:
   ```bash
   curl -X POST "http://localhost:5173/api/public/jobs/dispatch-due-sms" \
     -H "Authorization: Bearer <your-LOVABLE_CRON_SECRET>" \
     -H "Content-Type: application/json"
   ```

5. Check **Supabase → Table Editor → sms_messages**: status should go `scheduled` → `sending` → `sent`.

6. Check httpSMS dashboard for delivery receipt.

---

## 7. Rate Limits & Safety

| Limit | Value | Where |
|-------|-------|-------|
| Max SMS/minute | 20 | `src/lib/httpsms.server.ts:1` (`MAX_SMS_PER_MINUTE`) |
| Stuck timeout | 10 min | `timeout_stuck_sms()` in migration |
| Claim batch size | 50 | `claim_due_sms(_limit DEFAULT 50)` |

The dispatcher:
- Claims only what fits in the remaining minute budget
- Uses `FOR UPDATE SKIP LOCKED` — safe to run multiple cron instances
- Marks `sending` → `failed` after 10 min (never auto-retries — manual retry via UI)

---

## 8. Adding/Removing Allowed Domains

Edit the domain list in `drizzle/migrations/0000_migration.sql`:

```sql
SELECT lower(split_part(coalesce(_email,''), '@', 2)) IN ('samuel-berthe.fr','explorethevault.ai','new-domain.com')
```

Then create a new migration (or re-run on a fresh DB). For existing DBs, run:

```sql
CREATE OR REPLACE FUNCTION public.is_allowed_email(_email text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT lower(split_part(coalesce(_email,''), '@', 2)) IN ('samuel-berthe.fr','explorethevault.ai','new-domain.com')
     AND array_length(string_to_array(coalesce(_email,''), '@'), 1) = 2;
$$;
```

---

## 9. Troubleshooting

| Symptom | Check |
|---------|-------|
| Cron returns 401 | `LOVABLE_CRON_SECRET` matches in host + caller |
| Cron returns 500 | `SUPABASE_SERVICE_ROLE_KEY` valid, DB reachable |
| SMS stuck in `sending` | `timeout_stuck_sms()` will flip to `failed` after 10 min |
| No SMS delivered | httpSMS dashboard → check API key, sender ID, credits |
| RLS blocks query | User email domain in allowlist? `is_allowed_user()` returns true? |

---

## 10. File Reference

| File | Purpose |
|------|---------|
| `drizzle/migrations/0000_migration.sql` | Full schema + functions |
| `drizzle/migrations/0001_migration.sql` | Adds `claimed_at` column |
| `src/lib/httpsms.server.ts` | httpSMS client + `sentLastMinute()` |
| `src/lib/sms.functions.ts` | `sendSmsNow` server function |
| `src/routes/api/public/jobs/dispatch-due-sms.ts` | Cron handler |
| `src/integrations/supabase/client.server.ts` | Service-role Supabase client |
| `src/integrations/supabase/cron-auth.ts` | Cron Bearer token auth |
| `.env.dist` | Template for local env vars |