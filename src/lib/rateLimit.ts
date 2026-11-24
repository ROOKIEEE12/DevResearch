/**
 * rateLimit.ts
 * Simple in-memory sliding-window rate limiter for Next.js API routes.
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateEntry {
  timestamps: number[];
}

const store = new Map<string, RateEntry>();

export interface RateLimitConfig {
  /** Max requests allowed within windowMs */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Route identifier prefix */
  keyPrefix: string;
}

/**
 * Extracts a client identifier from headers or falls back to 'local'.
 */
function getClientId(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'local';
}

/**
 * Checks rate limit for a request. Returns a 429 NextResponse if exceeded, or null if allowed.
 */
export function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig
): NextResponse | null {
  const now = Date.now();
  const key = `${config.keyPrefix}:${getClientId(req)}`;
  const cutoff = now - config.windowMs;

  // Periodic cleanup to avoid unbounded map growth
  if (store.size > 500) {
    store.forEach((val, k) => {
      val.timestamps = val.timestamps.filter((t) => t > cutoff);
      if (val.timestamps.length === 0) store.delete(k);
    });
  }

  const entry = store.get(key) || { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= config.limit) {
    const oldest = entry.timestamps[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + config.windowMs - now) / 1000));
    return NextResponse.json(
      {
        error: `Rate limit exceeded. Please wait ${retryAfterSec}s before retrying.`,
        retryAfter: retryAfterSec,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSec) },
      }
    );
  }

  entry.timestamps.push(now);
  store.set(key, entry);
  return null;
}
