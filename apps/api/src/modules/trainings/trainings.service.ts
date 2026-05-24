import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestUser } from "../../shared/auth/request-user.type";
import { PageQueryDto } from "../../shared/pagination/page-query.dto";
import { TenantService } from "../../shared/tenant/tenant.service";
import { CreateTrainingDto } from "./dto/create-training.dto";

@Injectable()
export class TrainingsService {
  constructor(private readonly prisma: PrismaService, private readonly tenant: TenantService) {}

  async findAll(user: RequestUser, query: PageQueryDto) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.training.findMany({ where: { organizationId }, include: { team: true }, orderBy: { startsAt: "asc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.training.count({ where: { organizationId } })
    ]);
    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async create(user: RequestUser, dto: CreateTrainingDto) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    await this.assertTeamInTenant(organizationId, dto.teamId);
    return this.prisma.training.create({ data: { ...dto, organizationId } });
  }

  async remove(user: RequestUser, id: string) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    return this.prisma.training.delete({ where: { id, organizationId } });
  }

  private async assertTeamInTenant(organizationId: string, teamId: string) {
    const count = await this.prisma.team.count({ where: { id: teamId, organizationId } });
    if (count !== 1) throw new ForbiddenException("Team does not belong to this organization.");
  }
}
