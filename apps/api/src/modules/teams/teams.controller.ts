import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { RequestUser } from "../../shared/auth/request-user.type";
import { PageQueryDto } from "../../shared/pagination/page-query.dto";
import { Roles } from "../../shared/rbac/roles.decorator";
import { CreateTeamDto } from "./dto/create-team.dto";
import { TeamsService } from "./teams.service";

@ApiTags("Teams")
@ApiBearerAuth()
@Controller("teams")
export class TeamsController {
  constructor(private readonly service: TeamsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.COACH, Role.PLAYER, Role.PARENT)
  findAll(@CurrentUser() user: RequestUser, @Query() query: PageQueryDto) {
    return this.service.findAll(user, query);
  }

  @Get(":id")
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.COACH, Role.PLAYER, Role.PARENT)
  findOne(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.service.findOne(user, id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.COACH)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateTeamDto) {
    return this.service.create(user, dto);
  }

  @Delete(":id")
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.COACH)
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.service.remove(user, id);
  }
}
