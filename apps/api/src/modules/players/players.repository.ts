import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { PageQueryDto } from "../../shared/pagination/page-query.dto";

@Injectable()
export class PlayersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(organizationId: string, query: PageQueryDto) {
    return this.prisma.player.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } }, team: true, parents: true },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize
    });
  }

  count(organizationId: string) {
    return this.prisma.player.count({ where: { organizationId } });
  }

  findOne(id: string, organizationId: string) {
    return this.prisma.player.findUniqueOrThrow({
      where: { id, organizationId },
      include: {
        user: { select: { id: true, username: true, firstName: true, lastName: true, email: true, birthDate: true, isActive: true } },
        organization: { select: { id: true, name: true, slug: true } },
        team: { select: { id: true, name: true, category: true, season: true } },
        parents: { include: { parent: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        payments: { orderBy: { dueDate: "desc" } },
      },
    });
  }

  create(data: Prisma.PlayerUncheckedCreateInput) {
    return this.prisma.player.create({ data });
  }

  delete(id: string, organizationId: string) {
    return this.prisma.player.delete({ where: { id, organizationId } });
  }

  countTenantUsers(organizationId: string, userIds: string[]) {
    return this.prisma.user.count({ where: { organizationId, id: { in: userIds } } });
  }

  countTenantTeams(organizationId: string, teamIds: string[]) {
    return this.prisma.team.count({ where: { organizationId, id: { in: teamIds } } });
  }
}
