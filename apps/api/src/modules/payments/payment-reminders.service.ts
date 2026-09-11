import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaymentStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { paymentReminderTemplate } from "../mail/mail.templates";

type ReminderSummary = {
  considered: number;
  emailsSent: number;
  emailsFailed: number;
  paymentsReminded: number;
};

@Injectable()
export class PaymentRemindersService {
  private readonly logger = new Logger(PaymentRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Emails players (and their parents) about receivables that are due soon or
   * already overdue. Runs across every tenant because it is triggered by an
   * external scheduler, not by a logged-in user.
   */
  async run(): Promise<ReminderSummary> {
    const now = new Date();
    const horizon = new Date(now.getTime() + this.daysAhead() * 24 * 60 * 60 * 1000);
    const repeatAfter = new Date(now.getTime() - this.repeatAfterDays() * 24 * 60 * 60 * 1000);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: PaymentStatus.DUE,
        dueDate: { lte: horizon },
        // Skip anything already reminded inside the repeat window, otherwise a
        // daily schedule would mail the same families every single day.
        OR: [{ remindedAt: null }, { remindedAt: { lt: repeatAfter } }],
      },
      include: {
        player: {
          include: {
            user: { select: { email: true, firstName: true, lastName: true } },
            parents: { include: { parent: { select: { email: true, firstName: true, lastName: true } } } },
          },
        },
      },
      take: this.batchSize(),
      orderBy: { dueDate: "asc" },
    });

    const summary: ReminderSummary = { considered: payments.length, emailsSent: 0, emailsFailed: 0, paymentsReminded: 0 };
    const loginUrl = `${this.config.get<string>("FRONTEND_URL", "http://localhost:3000").replace(/\/$/, "")}/dashboard/payments`;

    for (const payment of payments) {
      const recipients = [
        payment.player.user,
        ...payment.player.parents.map((link) => link.parent),
      ].filter((account): account is { email: string; firstName: string; lastName: string } => Boolean(account?.email));

      if (!recipients.length) continue;

      const overdue = payment.dueDate < now;
      const amount = this.formatAmount(payment.amountCents);
      const dueDate = payment.dueDate.toLocaleDateString("it-IT");
      let delivered = false;

      for (const recipient of recipients) {
        const name = [recipient.firstName, recipient.lastName].filter(Boolean).join(" ") || recipient.email;
        try {
          const result = await this.mail.send({
            to: recipient.email,
            ...paymentReminderTemplate(name, amount, dueDate, overdue, loginUrl),
          });
          if (result.sent) {
            summary.emailsSent += 1;
            delivered = true;
          } else {
            summary.emailsFailed += 1;
          }
        } catch (error) {
          summary.emailsFailed += 1;
          this.logger.error(`Reminder for payment ${payment.id} to ${recipient.email} failed.`, error);
        }
      }

      // Only stamp the payment when at least one recipient was reached, so a
      // provider outage does not silently swallow the reminder.
      if (delivered) {
        await this.prisma.payment.update({ where: { id: payment.id }, data: { remindedAt: new Date() } });
        summary.paymentsReminded += 1;
      }
    }

    this.logger.log(
      `Payment reminders: ${summary.paymentsReminded}/${summary.considered} payments reminded, ${summary.emailsSent} emails sent, ${summary.emailsFailed} failed.`,
    );
    return summary;
  }

  private formatAmount(amountCents: number) {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(amountCents / 100);
  }

  private daysAhead() {
    return Number(this.config.get("PAYMENT_REMINDER_DAYS_AHEAD") ?? 7);
  }

  private repeatAfterDays() {
    return Number(this.config.get("PAYMENT_REMINDER_REPEAT_DAYS") ?? 7);
  }

  private batchSize() {
    return Number(this.config.get("PAYMENT_REMINDER_BATCH_SIZE") ?? 200);
  }
}
