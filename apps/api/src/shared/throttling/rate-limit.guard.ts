import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { RATE_LIMIT_KEY, RateLimitOptions } from "./rate-limit.decorator";

type Bucket = { count: number; expiresAt: number };

/**
 * Small in-memory fixed-window rate limiter for the unauthenticated endpoints
 * (login, register, refresh, resend verification). State is per process: with
 * more than one API instance, swap the map for a shared Redis store.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  private lastSweep = Date.now();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!options) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const key = this.bucketKey(context, request, options);
    const now = Date.now();
    this.sweep(now);

    const bucket = this.buckets.get(key);
    if (!bucket || bucket.expiresAt <= now) {
      this.buckets.set(key, { count: 1, expiresAt: now + options.windowSeconds * 1000 });
      return true;
    }

    bucket.count += 1;
    if (bucket.count > options.limit) {
      const retryAfter = Math.ceil((bucket.expiresAt - now) / 1000);
      throw new HttpException(
        `Too many requests. Try again in ${retryAfter} second(s).`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }

  private bucketKey(context: ExecutionContext, request: Request, options: RateLimitOptions) {
    const route = `${context.getClass().name}.${context.getHandler().name}`;
    const parts = [route, this.clientIp(request)];

    if (options.perEmail) {
      const email = (request.body as { email?: unknown } | undefined)?.email;
      if (typeof email === "string") parts.push(email.trim().toLowerCase());
    }

    return parts.join("|");
  }

  private clientIp(request: Request) {
    // Render and similar proxies forward the real client address here. Only the
    // first hop is trusted, the rest of the chain is attacker-controlled.
    const forwarded = request.header("x-forwarded-for");
    const first = forwarded?.split(",")[0]?.trim();
    return first || request.ip || "unknown";
  }

  private sweep(now: number) {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;
    for (const [key, bucket] of this.buckets) {
      if (bucket.expiresAt <= now) this.buckets.delete(key);
    }
  }
}
