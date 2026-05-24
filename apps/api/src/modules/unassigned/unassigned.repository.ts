import { Injectable } from "@nestjs/common";
import { ProfileAssignmentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class UnassignedRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPlayers(where: Prisma.PlayerWhereInput) {
    return this.prisma.player.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true, organizationId: true } },
        organization: { select: { id: true, name: true, slug: true } },
        team: { select: { id: true, name: true, season: true, organizationId: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  findCoaches(where: Prisma.CoachWhereInput) {
    return this.prisma.coach.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true, organizationId: true } },
        organization: { select: { id: true, name: true, slug: true } },
        teams: { include: { team: { select: { id: true, name: true, season: true, organizationId: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  playerSvincolatiWhere(organizationId?: string): Prisma.PlayerWhereInput {
    const base: Prisma.PlayerWhereInput[] = [
      { assignmentStatus: ProfileAssignmentStatus.UNASSIGNED },
      { organizationId: null },
    ];

    if (organizationId) base.push({ organizationId, teamId: null });
    else base.push({ teamId: null });

    return { OR: base };
  }

  coachSvincolatiWhere(organizationId?: string): Prisma.CoachWhereInput {
    const base: Prisma.CoachWhereInput[] = [
      { assignmentStatus: ProfileAssignmentStatus.UNASSIGNED },
      { organizationId: null },
    ];

    if (organizationId) base.push({ organizationId, teams: { none: {} } });
    else base.push({ teams: { none: {} } });

    return { OR: base };
  }
}
