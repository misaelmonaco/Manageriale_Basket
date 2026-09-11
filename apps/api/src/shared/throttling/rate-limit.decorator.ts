import { SetMetadata } from "@nestjs/common";

export const RATE_LIMIT_KEY = "rate_limit";

export type RateLimitOptions = {
  /** Maximum number of requests allowed inside the window. */
  limit: number;
  /** Sliding window length in seconds. */
  windowSeconds: number;
  /**
   * When true the request body `email` field is part of the bucket key, so an
   * attacker rotating IPs still cannot hammer a single account.
   */
  perEmail?: boolean;
};

/**
 * Throttles a route by client IP (and optionally by the submitted email).
 * Applied through the global `RateLimitGuard`.
 */
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
