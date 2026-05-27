import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { PageQueryDto } from "../../shared/pagination/page-query.dto";

@Injectable()
export class TeamsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(organizationId: string, query: PageQueryDto) {
    return this.prisma.team.findMany({
      where: { organizationId },
      include: { _count: { select: { players: true, coaches: true, directors: true } } },
      orderBy: { name: "asc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize
    });
  }

  count(organizationId: string) {
    return this.prisma.team.count({ where: { organizationId } });
  }

  findOne(id: string, organizationId: string) {
    return this.prisma.team.findUniqueOrThrow({
      where: { id, organizationId },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        players: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, birthDate: true } },
            payments: { orderBy: { dueDate: "desc" } },
          },
          orderBy: { user: { lastName: "asc" } },
        },
        coaches: { include: { coach: { include: { user: { select: { firstName: true, lastName: true, email: true } } } } } },
        directors: { include: { director: { select: { firstName: true, lastName: true, email: true } } } },
        _count: { select: { players: true, coaches: true, directors: true, trainings: true, homeMatches: true } },
      },
    });
  }

  create(data: Prisma.TeamUncheckedCreateInput) {
    return this.prisma.team.create({ data });
  }

  delete(id: string, organizationId: string) {
    return this.prisma.team.delete({ where: { id, organizationId } });
  }
}
