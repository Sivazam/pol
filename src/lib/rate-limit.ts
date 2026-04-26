/**
 * Simple in-memory token-bucket rate limiter, keyed by (route, identifier).
 *
 * INTERIM IMPLEMENTATION — process-local memory only.
 * For production multi-instance deployment swap to Redis or a Postgres-backed table.
 *
 * Use:
 *   const r = rateLimit('login', ip, { max: 10, windowMs: 60_000 });
 *   if (!r.ok) return new Response('Too many requests', { status: 429, headers: r.headers });
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodic cleanup so the map doesn't grow unbounded.
const CLEANUP_INTERVAL_MS = 5 * 60_000;
let lastCleanup = Date.now();

function maybeCleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitOptions {
  max: number;
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  headers: Record<string, string>;
}

export function rateLimit(
  scope: string,
  identifier: string,
  opts: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  maybeCleanup(now);

  const key = `${scope}:${identifier}`;
  const existing = buckets.get(key);

  let bucket: Bucket;
  if (!existing || existing.resetAt <= now) {
    bucket = { count: 1, resetAt: now + opts.windowMs };
    buckets.set(key, bucket);
  } else {
    existing.count += 1;
    bucket = existing;
  }

  const remaining = Math.max(0, opts.max - bucket.count);
  const ok = bucket.count <= opts.max;
  const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(opts.max),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.floor(bucket.resetAt / 1000)),
  };
  if (!ok) headers['Retry-After'] = String(retryAfterSec);

  return { ok, remaining, resetAt: bucket.resetAt, headers };
}

/** Best-effort client IP extraction from a Next.js request. */
export function clientIp(req: Request | { headers: Headers }): string {
  const h = req.headers;
  return (
    h.get('x-real-ip') ||
    h.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  );
}
