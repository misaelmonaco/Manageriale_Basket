import { Module } from "@nestjs/common";
import { MailModule } from "../mail/mail.module";
import { UnassignedController } from "./unassigned.controller";
import { UnassignedRepository } from "./unassigned.repository";
import { UnassignedService } from "./unassigned.service";

@Module({
  imports: [MailModule],
  controllers: [UnassignedController],
  providers: [UnassignedService, UnassignedRepository],
})
export class UnassignedModule {}
