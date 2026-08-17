# 3125 Embassy Drive — deploying the live dashboard

Two files do everything: `index.html` (the dashboard) and `api/state.js` (a ~60-line
function that reads and writes one shared record). Total setup is about 10 minutes.

## What you get

A URL like `embassy-3125.vercel.app` that works on any phone or laptop. Everyone
sees **the same** statuses, quotes, notes and design rows. It checks for other
people's changes every 20 seconds, and there's a **Pull latest** button.

## The 10-minute path (no terminal)

1. **Make a GitHub repo** — new repo, then upload these files, keeping the folder
   shape exactly as it is:
   ```
   index.html
   api/state.js
   ```
2. **Import it to Vercel** — vercel.com → Add New → Project → pick the repo →
   Deploy. Framework preset: **Other**. No build settings to change.
3. **Attach a database** — in the Vercel project: **Storage** → Marketplace →
   **Upstash for Redis** → create (free tier is plenty; this stores one small
   record). Vercel injects `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you.
4. **Redeploy** — Deployments → ⋯ → Redeploy, so the function picks up the new
   environment variables.
5. Open the URL. The header should read **"Live shared workspace."**

If it says "This device only," the function isn't reachable — step 3 or 4 was
skipped. The dashboard still works, just privately, so nothing is lost.

## Add a passphrase (recommended)

Without one, anyone who has the URL can read and edit — including vendor pricing.

Vercel project → Settings → Environment Variables → add **`APP_KEY`** with any
phrase → Redeploy. Each person is prompted once and their browser remembers it.

This is a shared passphrase, not real user accounts. Fine for family plus a
contractor; don't put anything genuinely sensitive behind it.

## The CLI path, if you prefer

```bash
npm i -g vercel
cd deploy
vercel          # preview deploy
vercel --prod   # production
```
Then add the Upstash integration as in step 3 and `vercel --prod` again.

## How the data works

- One Redis key, `embassy3125:state`, holds the whole workspace as JSON.
- Saves are debounced ~600ms, so typing doesn't hammer the API.
- **Last write wins.** If you and Alexandra edit the same field within the same
  20-second window, the later save takes it. With two or three people this is a
  non-issue in practice; polling skips pulling while someone is mid-edit.
- **Backup JSON** in the header downloads the whole state. Worth doing after big
  sessions — this is one Redis key on a free tier, not a backed-up database.
- **Export CSV** still produces the punch list for Excel.

## Other hosts

Any static host plus a small function works the same way: Netlify (move
`api/state.js` to `netlify/functions/state.js`), Cloudflare Pages Functions, or
Render. Vercel is the least fiddly because the Upstash integration wires the
environment variables for you.

## If you'd rather not run infrastructure

Honest alternative: import the punch-list CSV into **Airtable** or **Notion**.
You lose the RFQ-copy button, the bid-package rollups and the budget logic, but
you gain real accounts, mobile apps, comments and revision history with nothing
to maintain. If this list is still alive in six months, that's the better home.
