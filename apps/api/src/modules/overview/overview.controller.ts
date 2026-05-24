import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { RequestUser } from "../../shared/auth/request-user.type";
import { Roles } from "../../shared/rbac/roles.decorator";
import { OverviewService } from "./overview.service";

@ApiTags("Overview")
@ApiBearerAuth()
@Controller("overview")
export class OverviewController {
  constructor(private readonly service: OverviewService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.COACH, Role.PLAYER, Role.PARENT)
  @ApiOperation({ summary: "Return the dashboard overview for the current role" })
  getOverview(@CurrentUser() user: RequestUser) {
    return this.service.getOverview(user);
  }
}
