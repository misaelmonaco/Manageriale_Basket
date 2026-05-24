import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { RequestUser } from "../../shared/auth/request-user.type";
import { PageQueryDto } from "../../shared/pagination/page-query.dto";
import { Roles } from "../../shared/rbac/roles.decorator";
import { CreateMatchDto } from "./dto/create-match.dto";
import { MatchesService } from "./matches.service";

@ApiTags("Matches")
@ApiBearerAuth()
@Controller("matches")
export class MatchesController {
  constructor(private readonly service: MatchesService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.COACH, Role.PLAYER, Role.PARENT)
  findAll(@CurrentUser() user: RequestUser, @Query() query: PageQueryDto) {
    return this.service.findAll(user, query);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.COACH)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateMatchDto) {
    return this.service.create(user, dto);
  }

  @Delete(":id")
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.COACH)
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.service.remove(user, id);
  }
}
