import { Body, Controller, Get, Post, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { Public } from "../../shared/auth/public.decorator";
import { isEmailVerificationRequired } from "../../shared/config/email-verification";
import { Roles } from "../../shared/rbac/roles.decorator";
import { RateLimit } from "../../shared/throttling/rate-limit.decorator";
import { MailService } from "../mail/mail.service";
import { MailTestDto } from "./dto/mail-test.dto";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
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
      // Surfaced because a false here means unverified accounts can sign in:
      // easy to leave switched on by accident while debugging delivery.
      emailVerificationRequired: isEmailVerificationRequired(this.config),
      environment: this.config.get("NODE_ENV") ?? "development",
    };
  }

  /**
   * Diagnoses the mail transport without sending anything: opens the SMTP
   * connection (or validates the API key) and reports the raw failure.
   */
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @Get("mail")
  @ApiOperation({ summary: "Check that the mail transport is reachable" })
  checkMail() {
    return this.mail.verifyTransport();
  }

  /**
   * Sends a real email and returns the provider's own error when it fails,
   * so delivery can be tested without registering a throwaway account.
   */
  @Roles(Role.SUPER_ADMIN)
  @ApiBearerAuth()
  @RateLimit({ limit: 5, windowSeconds: 300 })
  @Post("mail/test")
  @ApiOperation({ summary: "Send a test email to the given address" })
  async sendTestMail(@Body() dto: MailTestDto) {
    const result = await this.mail.send({
      to: dto.to,
      subject: "CourtVision - email di prova",
      html: "<p>Se leggi questo messaggio, l'invio delle email funziona.</p>",
      text: "Se leggi questo messaggio, l'invio delle email funziona.",
    });

    return { provider: this.mail.provider(), ...result };
  }
}
