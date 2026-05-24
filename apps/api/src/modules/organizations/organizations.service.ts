import { ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestUser } from "../../shared/auth/request-user.type";
import { PageQueryDto } from "../../shared/pagination/page-query.dto";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PageQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: "desc" }
      }),
      this.prisma.organization.count()
    ]);
    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  findOne(user: RequestUser, id: string) {
    return this.prisma.organization.findUniqueOrThrow({
      where: { id: this.authorizedOrganizationId(user, id) },
      include: {
        _count: { select: { users: true, teams: true, players: true, coaches: true, matches: true } },
        teams: {
          orderBy: { name: "asc" },
          include: { _count: { select: { players: true, coaches: true, trainings: true } } }
        }
      }
    });
  }

  findBranding(user: RequestUser, id: string) {
    return this.prisma.organization.findUniqueOrThrow({
      where: { id: this.authorizedOrganizationId(user, id) },
      select: { id: true, name: true, slug: true, settings: true }
    });
  }

  create(dto: CreateOrganizationDto) {
    const data: Prisma.OrganizationCreateInput = {
      ...dto,
      settings: dto.settings === undefined ? undefined : (dto.settings as Prisma.InputJsonObject)
    };
    return this.prisma.organization.create({ data });
  }

  update(user: RequestUser, id: string, dto: UpdateOrganizationDto) {
    const organizationId = this.authorizedOrganizationId(user, id);
    const data: Prisma.OrganizationUpdateInput = {
      ...dto,
      settings: dto.settings === undefined ? undefined : (dto.settings as Prisma.InputJsonValue)
    };

    return this.prisma.organization.update({ where: { id: organizationId }, data });
  }

  updateSettings(user: RequestUser, id: string, settings: Record<string, unknown>) {
    return this.prisma.organization.update({
      where: { id: this.authorizedOrganizationId(user, id) },
      data: { settings: settings as Prisma.InputJsonObject }
    });
  }

  remove(id: string) {
    return this.prisma.organization.delete({ where: { id } });
  }

  private authorizedOrganizationId(user: RequestUser, requestedId: string) {
    if (user.role === "SUPER_ADMIN") return requestedId;
    if (user.organizationId !== requestedId) throw new ForbiddenException("You can only access your own organization.");
    return requestedId;
  }
}
