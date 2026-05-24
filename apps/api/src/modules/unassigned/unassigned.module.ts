import { Module } from "@nestjs/common";
import { UnassignedController } from "./unassigned.controller";
import { UnassignedRepository } from "./unassigned.repository";
import { UnassignedService } from "./unassigned.service";

@Module({
  controllers: [UnassignedController],
  providers: [UnassignedService, UnassignedRepository],
})
export class UnassignedModule {}
