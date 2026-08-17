// Shared state store for the 3125 Embassy Drive dashboard.
//
// GET  /api/state  -> { state: "<json string>" | null }
// PUT  /api/state  -> body is the JSON state; saved as one key
//
// Storage: any Upstash-compatible Redis REST endpoint. Vercel's Upstash
// integration injects KV_REST_API_URL / KV_REST_API_TOKEN automatically;
// a standalone Upstash database uses UPSTASH_REDIS_REST_URL / _TOKEN.
// Both names are accepted, so you don't have to rename anything.
//
// Optional: set APP_KEY to require a passphrase. The dashboard will prompt
// once and remember it. Without APP_KEY, anyone with the URL can read/write.

const URL_ =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const APP_KEY = process.env.APP_KEY || "";
const REDIS_KEY = "embassy3125:state";
const MAX_BYTES = 2_000_000; // generous for this dataset, blocks abuse

async function redis(path, options = {}) {
  const res = await fetch(`${URL_}/${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(options.headers || {}) },
  });
  if (!res.ok) throw new Error(`redis ${res.status} ${await res.text()}`);
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!URL_ || !TOKEN) {
    // No database attached yet. Tell the client so it falls back to local mode
    // instead of appearing broken.
    return res.status(501).json({
      error: "no_store",
      hint: "Add an Upstash Redis integration in Vercel → Storage, then redeploy.",
    });
  }

  if (APP_KEY && req.headers["x-app-key"] !== APP_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    if (req.method === "GET") {
      const out = await redis(`get/${REDIS_KEY}`);
      return res.status(200).json({ state: out.result ?? null });
    }

    if (req.method === "PUT" || req.method === "POST") {
      let body = req.body;
      if (typeof body !== "string") body = JSON.stringify(body ?? {});
      if (body.length > MAX_BYTES) {
        return res.status(413).json({ error: "too_large" });
      }
      try {
        JSON.parse(body); // refuse anything that isn't valid JSON
      } catch {
        return res.status(400).json({ error: "invalid_json" });
      }
      await redis(`set/${REDIS_KEY}`, { method: "POST", body });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "method_not_allowed" });
  } catch (err) {
    return res.status(500).json({ error: "store_failed", detail: String(err.message || err) });
  }
}
