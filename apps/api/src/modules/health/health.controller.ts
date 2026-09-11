import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../../prisma/prisma.service";
import { Public } from "../../shared/auth/public.decorator";
import { MailService } from "../mail/mail.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /**
   * Liveness only: answers as long as the process is up. Uptime monitors point
   * here, which on a sleeping free instance also serves to wake it.
   */
  @Public()
  @Get()
  @ApiOperation({ summary: "Liveness probe" })
  live() {
    return { status: "ok", uptimeSeconds: Math.round(process.uptime()) };
  }

  /**
   * Readiness: fails with 503 when the database is unreachable, so a deploy or
   * a load balancer can tell a broken instance from a healthy one.
   */
  @Public()
  @Get("ready")
  @ApiOperation({ summary: "Readiness probe, including database connectivity" })
  async ready() {
    const startedAt = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: "error",
        database: "unreachable",
      });
    }

    return {
      status: "ok",
      database: "ok",
      databaseLatencyMs: Date.now() - startedAt,
      mailProvider: this.mail.provider(),
    };
  }
}
