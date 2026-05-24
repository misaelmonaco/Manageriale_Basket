import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestUser } from "../../shared/auth/request-user.type";
import { PageQueryDto } from "../../shared/pagination/page-query.dto";
import { TenantService } from "../../shared/tenant/tenant.service";
import { CreateMatchDto } from "./dto/create-match.dto";

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService, private readonly tenant: TenantService) {}

  async findAll(user: RequestUser, query: PageQueryDto) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.match.findMany({ where: { organizationId }, include: { homeTeam: true }, orderBy: { startsAt: "asc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.match.count({ where: { organizationId } })
    ]);
    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async create(user: RequestUser, dto: CreateMatchDto) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    await this.assertTeamInTenant(organizationId, dto.homeTeamId);
    return this.prisma.match.create({ data: { ...dto, organizationId } });
  }

  async remove(user: RequestUser, id: string) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    return this.prisma.match.delete({ where: { id, organizationId } });
  }

  private async assertTeamInTenant(organizationId: string, teamId: string) {
    const count = await this.prisma.team.count({ where: { id: teamId, organizationId } });
    if (count !== 1) throw new ForbiddenException("Team does not belong to this organization.");
  }
}
