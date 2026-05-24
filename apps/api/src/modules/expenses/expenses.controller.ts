import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { RequestUser } from "../../shared/auth/request-user.type";
import { PageQueryDto } from "../../shared/pagination/page-query.dto";
import { Roles } from "../../shared/rbac/roles.decorator";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { ExpensesService } from "./expenses.service";

@ApiTags("Expenses")
@ApiBearerAuth()
@Controller("expenses")
export class ExpensesController {
  constructor(private readonly service: ExpensesService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
  findAll(@CurrentUser() user: RequestUser, @Query() query: PageQueryDto) {
    return this.service.findAll(user, query);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateExpenseDto) {
    return this.service.create(user, dto);
  }

  @Delete(":id")
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.service.remove(user, id);
  }
}
