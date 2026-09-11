import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";

export type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendMailResult = { sent: boolean };

type MailProvider = "resend" | "smtp" | "none";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Which transport will actually be used.
   *
   * HTTP is the default when an API key is present because most PaaS free
   * tiers (Render included) block outbound SMTP ports, so nodemailer can only
   * time out there. MAIL_PROVIDER forces one transport explicitly.
   */
  provider(): MailProvider {
    const forced = this.config.get<string>("MAIL_PROVIDER")?.trim().toLowerCase();
    if (forced === "resend") return this.hasResendConfig() ? "resend" : "none";
    if (forced === "smtp") return this.hasSmtpConfig() ? "smtp" : "none";

    if (this.hasResendConfig()) return "resend";
    if (this.hasSmtpConfig()) return "smtp";
    return "none";
  }

  isConfigured() {
    return this.provider() !== "none";
  }

  async send(input: SendMailInput): Promise<SendMailResult> {
    const provider = this.provider();

    if (provider === "resend") return this.sendWithResend(input);
    if (provider === "smtp") return this.sendWithSmtp(input);

    this.logger.warn(`No mail provider is configured. Email "${input.subject}" was not sent.`);
    return { sent: false };
  }

  private async sendWithResend(input: SendMailInput): Promise<SendMailResult> {
    // Plain HTTPS on port 443, so it works on hosts that block SMTP egress.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.getOrThrow<string>("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.fromAddress(),
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // The body carries the provider's reason (unverified domain, invalid
        // key, rate limit); it is worth logging verbatim.
        this.logger.error(`Resend rejected the email (${response.status}): ${await response.text()}`);
        return { sent: false };
      }

      return { sent: true };
    } catch (error) {
      this.logger.error("Resend request failed", error);
      return { sent: false };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async sendWithSmtp(input: SendMailInput): Promise<SendMailResult> {
    const port = Number(this.config.get<string>("SMTP_PORT") ?? 465);
    // If SMTP_SECURE is not set, infer it from the port:
    // 465 = implicit TLS (secure: true), 587/25 = STARTTLS (secure: false).
    const secureRaw = this.config.get<string>("SMTP_SECURE");
    const secure = secureRaw === undefined || secureRaw === "" ? port === 465 : secureRaw !== "false";
    const transporter = nodemailer.createTransport({
      host: this.config.getOrThrow<string>("SMTP_HOST"),
      port,
      secure,
      auth: {
        user: this.config.getOrThrow<string>("SMTP_USER"),
        pass: this.config.getOrThrow<string>("SMTP_PASSWORD"),
      },
      // Fail fast instead of hanging the HTTP request if the SMTP host
      // is unreachable (e.g. blocked port on the hosting provider).
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });

    try {
      await transporter.sendMail({
        from: this.fromAddress(),
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      return { sent: true };
    } catch (error) {
      this.logger.error("SMTP send failed", error);
      return { sent: false };
    } finally {
      transporter.close();
    }
  }

  private hasResendConfig() {
    return Boolean(this.config.get<string>("RESEND_API_KEY") && this.fromAddress());
  }

  private hasSmtpConfig() {
    return Boolean(
      this.config.get<string>("SMTP_HOST") &&
        this.config.get<string>("SMTP_USER") &&
        this.config.get<string>("SMTP_PASSWORD") &&
        this.fromAddress(),
    );
  }

  private fromAddress() {
    return this.config.get<string>("MAIL_FROM") ?? this.config.get<string>("SMTP_FROM") ?? this.config.get<string>("SMTP_USER");
  }
}
