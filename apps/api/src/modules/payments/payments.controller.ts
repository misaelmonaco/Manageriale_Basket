import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { RequestUser } from "../../shared/auth/request-user.type";
import { Roles } from "../../shared/rbac/roles.decorator";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { PaymentQueryDto } from "./dto/payment-query.dto";
import { UpdatePaymentStatusDto } from "./dto/update-payment-status.dto";
import { PaymentsService } from "./payments.service";

@ApiTags("Payments")
@ApiBearerAuth()
@Controller("payments")
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.PLAYER, Role.PARENT)
  findAll(@CurrentUser() user: RequestUser, @Query() query: PaymentQueryDto) {
    return this.service.findAll(user, query);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePaymentDto) {
    return this.service.create(user, dto);
  }

  @Patch(":id/status")
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
  updateStatus(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdatePaymentStatusDto) {
    return this.service.updateStatus(user, id, dto.status);
  }

  @Delete(":id")
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.service.remove(user, id);
  }
}
