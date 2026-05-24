import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { RequestUser } from "../../shared/auth/request-user.type";
import { Roles } from "../../shared/rbac/roles.decorator";
import { AssignOrganizationDto } from "./dto/assign-organization.dto";
import { AssignTeamDto } from "./dto/assign-team.dto";
import { UnassignedService } from "./unassigned.service";

@ApiTags("Unassigned")
@ApiBearerAuth()
@Controller("unassigned")
@Roles(Role.SUPER_ADMIN, Role.DIRECTOR)
export class UnassignedController {
  constructor(private readonly service: UnassignedService) {}

  @Get()
  @ApiOperation({ summary: "List all svincolati player and coach profiles visible to the current user" })
  findAll(@CurrentUser() user: RequestUser) {
    return this.service.findAll(user);
  }

  @Get("players")
  @ApiOperation({ summary: "List svincolati player profiles visible to the current user" })
  findPlayers(@CurrentUser() user: RequestUser) {
    return this.service.findPlayers(user);
  }

  @Get("coaches")
  @ApiOperation({ summary: "List svincolati coach profiles visible to the current user" })
  findCoaches(@CurrentUser() user: RequestUser) {
    return this.service.findCoaches(user);
  }

  @Post(":profileId/assign-organization")
  @ApiOperation({ summary: "Assign a svincolato profile to an organization" })
  assignOrganization(
    @CurrentUser() user: RequestUser,
    @Param("profileId") profileId: string,
    @Body() dto: AssignOrganizationDto,
  ) {
    return this.service.assignOrganization(user, profileId, dto);
  }

  @Post(":profileId/assign-team")
  @ApiOperation({ summary: "Assign a svincolato profile to a team" })
  assignTeam(@CurrentUser() user: RequestUser, @Param("profileId") profileId: string, @Body() dto: AssignTeamDto) {
    return this.service.assignTeam(user, profileId, dto);
  }
}
