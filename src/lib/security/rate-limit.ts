// Rate limiter — simple in-memory sliding window.
// Protects against brute-force login attempts and API abuse.
// In production, replace with Redis-backed limiter (e.g. @upstash/ratelimit).

interface WindowEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, WindowEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Check if a request from the given identifier is within rate limits.
 * @param identifier — IP address, user ID, or any unique key
 * @param maxRequests — max requests per window
 * @param windowMs — window duration in milliseconds
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    // First request or window expired — start new window
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, retryAfterMs: 0 };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: entry.resetAt - now,
    };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, retryAfterMs: 0 };
}

// Preset configurations
export const RATE_LIMITS = {
  // Login: 5 attempts per 15 minutes per IP
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
  // API: 60 requests per minute per user
  api: { maxRequests: 60, windowMs: 60 * 1000 },
  // AI Brain: 10 requests per minute per user (OpenAI cost protection)
  aiBrain: { maxRequests: 10, windowMs: 60 * 1000 },
  // Setup: 3 requests per hour per IP (prevent enumeration)
  setup: { maxRequests: 3, windowMs: 60 * 60 * 1000 },
  // OCR: 20 uploads per minute per user
  ocr: { maxRequests: 20, windowMs: 60 * 1000 },
} as const;
