import { getConfig } from "./config.server";
import { RateLimitError } from "./errors";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export function checkRateLimit(identifier: string): void {
  const config = getConfig();
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + config.RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  if (entry.count >= config.RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    throw new RateLimitError(
      `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      retryAfter,
    );
  }

  entry.count++;
}

export function getRateLimitInfo(identifier: string): {
  remaining: number;
  resetTime: number;
} {
  const config = getConfig();
  const entry = rateLimitMap.get(identifier);
  const now = Date.now();

  if (!entry || now > entry.resetTime) {
    return {
      remaining: config.RATE_LIMIT_MAX_REQUESTS,
      resetTime: now + config.RATE_LIMIT_WINDOW_MS,
    };
  }

  return {
    remaining: Math.max(0, config.RATE_LIMIT_MAX_REQUESTS - entry.count),
    resetTime: entry.resetTime,
  };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean up every minute
