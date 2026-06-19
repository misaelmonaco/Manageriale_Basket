import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

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
      this.config.get<string>("RESEND_API_KEY") &&
      this.config.get<string>("RESEND_FROM_EMAIL"),
    );
  }

  async send(input: SendMailInput) {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    const from = this.config.get<string>("RESEND_FROM_EMAIL");

    if (!apiKey || !from) {
      this.logger.warn("Resend is not configured. Email was not sent.");
      return { sent: false };
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Resend send failed: ${body}`);
      return { sent: false };
    }

    return { sent: true };
  }
}
