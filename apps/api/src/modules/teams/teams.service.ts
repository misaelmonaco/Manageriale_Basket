import { Injectable } from "@nestjs/common";
import { RequestUser } from "../../shared/auth/request-user.type";
import { PageQueryDto } from "../../shared/pagination/page-query.dto";
import { TenantService } from "../../shared/tenant/tenant.service";
import { CreateTeamDto } from "./dto/create-team.dto";
import { TeamsRepository } from "./teams.repository";

@Injectable()
export class TeamsService {
  constructor(
    private readonly repository: TeamsRepository,
    private readonly tenant: TenantService
  ) {}

  async findAll(user: RequestUser, query: PageQueryDto) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    const [data, total] = await Promise.all([this.repository.findMany(organizationId, query), this.repository.count(organizationId)]);
    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(user: RequestUser, id: string) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    return this.repository.findOne(id, organizationId);
  }

  async create(user: RequestUser, dto: CreateTeamDto) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user, dto.organizationSlug);
    const { organizationSlug, ...teamDto } = dto;
    void organizationSlug;
    return this.repository.create({ ...teamDto, organizationId });
  }

  async remove(user: RequestUser, id: string) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    return this.repository.delete(id, organizationId);
  }
}
