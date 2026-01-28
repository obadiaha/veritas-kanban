import expressRateLimit from 'express-rate-limit';

/**
 * Rate limiting middleware using express-rate-limit.
 *
 * Uses the built-in MemoryStore which:
 *  - Automatically cleans up expired entries (no memory leaks)
 *  - Uses a precise sliding window counter algorithm
 *  - Is the right choice for a single-instance local dev tool
 *
 * State resets on server restart, which is acceptable for this use case.
 * If persistence is ever needed, swap MemoryStore for a file or Redis store.
 */

/**
 * Create a rate limiting middleware with the given options.
 * Wraps express-rate-limit for consistency.
 */
export function rateLimit(options: {
  limit?: number;
  windowMs?: number;
  message?: string;
  skip?: (req: import('express').Request) => boolean;
} = {}) {
  const {
    limit = 100,
    windowMs = 60_000,
    message = 'Too many requests, please try again later.',
    skip,
  } = options;

  return expressRateLimit({
    windowMs,
    limit,
    message: { error: message },
    standardHeaders: 'draft-7', // RateLimit-* headers (IETF standard)
    legacyHeaders: true,        // X-RateLimit-* headers (backward compat)
    skip,
    // validate: false would disable warnings — keep enabled for dev safety
  });
}

/**
 * Pre-configured rate limiter for general API use.
 * 100 requests per minute per IP.
 */
export const apiRateLimit = rateLimit({
  limit: 100,
  windowMs: 60_000,
  message: 'Too many API requests. Please slow down.',
});

/**
 * Stricter rate limiter for sensitive operations.
 * 10 requests per minute per IP (e.g., settings changes, auth attempts).
 */
export const strictRateLimit = rateLimit({
  limit: 10,
  windowMs: 60_000,
  message: 'Too many requests. Max 10 per minute for this endpoint.',
});
