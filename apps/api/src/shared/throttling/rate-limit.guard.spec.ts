import { ExecutionContext, HttpException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RateLimitGuard } from "./rate-limit.guard";
import { RateLimitOptions } from "./rate-limit.decorator";

type RequestOverrides = { ip?: string; forwardedFor?: string; body?: unknown };

function contextFor({ ip = "1.1.1.1", forwardedFor, body = {} }: RequestOverrides = {}) {
  const request = {
    ip,
    body,
    header: (name: string) => (name === "x-forwarded-for" ? forwardedFor : undefined),
  };

  return {
    getClass: () => class AuthController {},
    getHandler: () => function login() {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function guardWith(options: RateLimitOptions | undefined) {
  const reflector = { getAllAndOverride: () => options } as unknown as Reflector;
  return new RateLimitGuard(reflector);
}

describe("RateLimitGuard", () => {
  it("allows every request when the route declares no limit", () => {
    const guard = guardWith(undefined);
    for (let i = 0; i < 50; i += 1) {
      expect(guard.canActivate(contextFor())).toBe(true);
    }
  });

  it("allows requests up to the limit and blocks the next one", () => {
    const guard = guardWith({ limit: 3, windowSeconds: 60 });

    expect(guard.canActivate(contextFor())).toBe(true);
    expect(guard.canActivate(contextFor())).toBe(true);
    expect(guard.canActivate(contextFor())).toBe(true);
    expect(() => guard.canActivate(contextFor())).toThrow(HttpException);
  });

  it("answers 429 with a retry hint once the bucket is full", () => {
    const guard = guardWith({ limit: 1, windowSeconds: 60 });
    guard.canActivate(contextFor());

    let caught: unknown;
    try {
      guard.canActivate(contextFor());
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(HttpException);
    expect((caught as HttpException).getStatus()).toBe(429);
    expect((caught as HttpException).message).toMatch(/Too many requests/);
  });

  it("keeps a separate bucket per client address", () => {
    const guard = guardWith({ limit: 1, windowSeconds: 60 });

    expect(guard.canActivate(contextFor({ ip: "1.1.1.1" }))).toBe(true);
    expect(guard.canActivate(contextFor({ ip: "2.2.2.2" }))).toBe(true);
    expect(() => guard.canActivate(contextFor({ ip: "1.1.1.1" }))).toThrow(HttpException);
  });

  it("trusts only the first hop of x-forwarded-for", () => {
    const guard = guardWith({ limit: 1, windowSeconds: 60 });
    const spoofed = { ip: "9.9.9.9", forwardedFor: "5.5.5.5, 6.6.6.6" };

    expect(guard.canActivate(contextFor(spoofed))).toBe(true);
    // Same real client, a different forged tail: it must land in the same bucket.
    expect(() => guard.canActivate(contextFor({ ip: "9.9.9.9", forwardedFor: "5.5.5.5, 7.7.7.7" }))).toThrow(HttpException);
  });

  it("separates buckets by email so one address cannot be hammered from many IPs", () => {
    const guard = guardWith({ limit: 1, windowSeconds: 60, perEmail: true });

    expect(guard.canActivate(contextFor({ ip: "1.1.1.1", body: { email: "a@example.com" } }))).toBe(true);
    expect(guard.canActivate(contextFor({ ip: "1.1.1.1", body: { email: "b@example.com" } }))).toBe(true);
    expect(() => guard.canActivate(contextFor({ ip: "1.1.1.1", body: { email: "a@example.com" } }))).toThrow(HttpException);
  });

  it("treats the email case-insensitively", () => {
    const guard = guardWith({ limit: 1, windowSeconds: 60, perEmail: true });

    expect(guard.canActivate(contextFor({ body: { email: "User@Example.com" } }))).toBe(true);
    expect(() => guard.canActivate(contextFor({ body: { email: " user@example.com " } }))).toThrow(HttpException);
  });

  it("lets the caller through again once the window has elapsed", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00Z"));
    try {
      const guard = guardWith({ limit: 1, windowSeconds: 60 });
      expect(guard.canActivate(contextFor())).toBe(true);
      expect(() => guard.canActivate(contextFor())).toThrow(HttpException);

      jest.setSystemTime(new Date("2026-01-01T00:01:01Z"));
      expect(guard.canActivate(contextFor())).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
