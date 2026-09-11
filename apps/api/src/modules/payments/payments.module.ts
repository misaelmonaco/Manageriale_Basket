import { Module } from "@nestjs/common";
import { MailModule } from "../mail/mail.module";
import { PaymentRemindersService } from "./payment-reminders.service";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [MailModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentRemindersService],
})
export class PaymentsModule {}
