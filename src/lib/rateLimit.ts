import type { NextRequest } from "next/server";

// In-memory store: key → [timestamps]
const store = new Map<string, number[]>();

/**
 * Simple in-memory rate limiter — suitable for single-instance dev/staging.
 * For multi-instance production, swap with Upstash Redis.
 *
 * Returns true if the request should be blocked.
 */
export function rateLimitByIP(
  req: NextRequest,
  action: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const key = `${action}:${ip}`;
  const now = Date.now();
  const hits = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= maxRequests) return true;
  hits.push(now);
  store.set(key, hits);
  return false;
}

export function rateLimitByEmail(
  email: string,
  action: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const key = `${action}:email:${email.toLowerCase()}`;
  const now = Date.now();
  const hits = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= maxRequests) return true;
  hits.push(now);
  store.set(key, hits);
  return false;
}
