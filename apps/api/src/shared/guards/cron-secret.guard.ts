import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { timingSafeEqual } from "node:crypto";

/**
 * Authenticates machine-triggered jobs with a shared secret sent as
 * `x-cron-secret`. Used for endpoints an external scheduler calls, so the
 * project does not need an in-process scheduler to run periodic work.
 */
@Injectable()
export class CronSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>("CRON_SECRET");
    if (!expected) throw new UnauthorizedException("Scheduled jobs are not enabled.");

    const provided = context.switchToHttp().getRequest<Request>().header("x-cron-secret") ?? "";
    if (!this.matches(provided, expected)) throw new UnauthorizedException("Invalid cron secret.");
    return true;
  }

  private matches(provided: string, expected: string) {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    // timingSafeEqual throws on length mismatch, so compare that separately.
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
