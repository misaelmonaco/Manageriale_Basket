import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { RequestUser } from "../../shared/auth/request-user.type";
import { PageQueryDto } from "../../shared/pagination/page-query.dto";
import { Roles } from "../../shared/rbac/roles.decorator";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { OrganizationsService } from "./organizations.service";

@ApiTags("Organizations")
@ApiBearerAuth()
@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN)
  findAll(@Query() query: PageQueryDto) {
    return this.service.findAll(query);
  }

  @Get(":id")
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
  findOne(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.service.findOne(user, id);
  }

  @Get(":id/branding")
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.COACH, Role.PLAYER, Role.PARENT)
  findBranding(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.service.findBranding(user, id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@Body() dto: CreateOrganizationDto) {
    return this.service.create(dto);
  }

  @Patch(":id")
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateOrganizationDto) {
    return this.service.update(user, id, dto);
  }

  @Patch(":id/settings")
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
  updateSettings(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() settings: Record<string, unknown>) {
    return this.service.updateSettings(user, id, settings);
  }

  @Delete(":id")
  @Roles(Role.SUPER_ADMIN)
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
