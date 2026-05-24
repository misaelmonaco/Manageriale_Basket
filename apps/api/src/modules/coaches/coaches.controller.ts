import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { RequestUser } from "../../shared/auth/request-user.type";
import { Roles } from "../../shared/rbac/roles.decorator";
import { CoachesService } from "./coaches.service";
import { CreateCoachDto } from "./dto/create-coach.dto";

@ApiTags("Coaches")
@ApiBearerAuth()
@Controller("coaches")
export class CoachesController {
  constructor(private readonly service: CoachesService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.COACH)
  findAll(@CurrentUser() user: RequestUser) {
    return this.service.findAll(user);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateCoachDto) {
    return this.service.create(user, dto);
  }

  @Delete(":id")
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.service.remove(user, id);
  }
}
