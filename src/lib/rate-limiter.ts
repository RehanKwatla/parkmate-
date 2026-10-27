// ==============================================================================
// ParkMate API Rate Limiting Utility
// Implements an in-memory sliding-window token bucket rate limiter
// Protects critical endpoints: bookings, recovery escalation, storage uploads
// ==============================================================================

import { NextResponse } from "next/server";

interface RateLimitRecord {
  tokens: number;
  lastRefill: number;
}

interface RateLimiterOptions {
  limit: number;      // Maximum allowed requests in the window
  windowMs: number;   // Window size in milliseconds
}

// In-memory token stores keyed by category and client identifier (IP or user ID)
const rateLimitStores = new Map<string, Map<string, RateLimitRecord>>();

/**
 * Extracts a stable client identifier from request headers.
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "anonymous_client";
}

/**
 * Checks and consumes a token for a given client and category.
 */
export function checkRateLimit(
  identifier: string,
  category: string,
  options: RateLimiterOptions = { limit: 20, windowMs: 60 * 1000 }
): {
  success: boolean;
  limit: number;
  remaining: number;
  resetInSeconds: number;
} {
  const now = Date.now();
  if (!rateLimitStores.has(category)) {
    rateLimitStores.set(category, new Map());
  }
  const store = rateLimitStores.get(category)!;

  let record = store.get(identifier);
  if (!record) {
    record = {
      tokens: options.limit,
      lastRefill: now,
    };
    store.set(identifier, record);
  }

  // Calculate elapsed time and replenish tokens
  const elapsed = now - record.lastRefill;
  if (elapsed > options.windowMs) {
    record.tokens = options.limit;
    record.lastRefill = now;
  } else {
    // Pro-rata token refill
    const tokensToAdd = (elapsed / options.windowMs) * options.limit;
    record.tokens = Math.min(options.limit, record.tokens + tokensToAdd);
    record.lastRefill = now;
  }

  const resetInSeconds = Math.max(1, Math.ceil((options.windowMs - (now - record.lastRefill)) / 1000));

  if (record.tokens >= 1) {
    record.tokens -= 1;
    return {
      success: true,
      limit: options.limit,
      remaining: Math.floor(record.tokens),
      resetInSeconds,
    };
  }

  return {
    success: false,
    limit: options.limit,
    remaining: 0,
    resetInSeconds,
  };
}

/**
 * Returns a 429 Too Many Requests response with standard rate-limiting headers.
 */
export function createRateLimitResponse(
  limit: number,
  remaining: number,
  resetInSeconds: number,
  categoryLabel = "endpoint"
): NextResponse {
  return NextResponse.json(
    {
      error: `Too many requests to this ${categoryLabel}. Please wait ${resetInSeconds} second(s) before retrying.`,
      code: "RATE_LIMIT_EXCEEDED",
      limit,
      remaining,
      retryAfterSeconds: resetInSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(resetInSeconds),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": String(remaining),
        "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + resetInSeconds),
      },
    }
  );
}
