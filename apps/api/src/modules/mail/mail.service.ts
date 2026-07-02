import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return Boolean(
      this.config.get<string>("SMTP_HOST") &&
      this.config.get<string>("SMTP_USER") &&
      this.config.get<string>("SMTP_PASSWORD") &&
      this.fromAddress(),
    );
  }

  async send(input: SendMailInput) {
    if (!this.isConfigured()) {
      this.logger.warn("SMTP is not configured. Email was not sent.");
      return { sent: false };
    }

    const port = Number(this.config.get<string>("SMTP_PORT") ?? 465);
    // If SMTP_SECURE is not set, infer it from the port:
    // 465 = implicit TLS (secure: true), 587/25 = STARTTLS (secure: false).
    const secureRaw = this.config.get<string>("SMTP_SECURE");
    const secure =
      secureRaw === undefined || secureRaw === ""
        ? port === 465
        : secureRaw !== "false";
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
    }
  }

  private fromAddress() {
    return (
      this.config.get<string>("SMTP_FROM") ??
      this.config.get<string>("SMTP_USER")
    );
  }
}
