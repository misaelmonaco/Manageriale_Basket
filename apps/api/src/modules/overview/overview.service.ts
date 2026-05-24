import { ForbiddenException, Injectable } from "@nestjs/common";
import { PaymentStatus, Role } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestUser } from "../../shared/auth/request-user.type";

@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(user: RequestUser) {
    if (user.role === Role.SUPER_ADMIN) return this.superAdminOverview();
    if (!user.organizationId) throw new ForbiddenException("User is not attached to an organization.");
    if (user.role === Role.DIRECTOR) return this.directorOverview(user.organizationId);
    if (user.role === Role.COACH) return this.coachOverview(user.sub, user.organizationId);
    if (user.role === Role.PLAYER) return this.playerOverview(user.sub, user.organizationId);
    return this.playerOverview(user.sub, user.organizationId);
  }

  private async superAdminOverview() {
    const [organizations, totals] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { users: true, teams: true, players: true, coaches: true, matches: true, payments: true } },
        },
      }),
      this.prisma.organization.count(),
    ]);

    return { role: Role.SUPER_ADMIN, totals: { organizations: totals }, organizations };
  }

  private async directorOverview(organizationId: string) {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const [matches, trainings, totalPlayers, playersWithDuePayments] = await this.prisma.$transaction([
      this.prisma.match.findMany({
        where: { organizationId, startsAt: { gte: now, lt: nextMonth } },
        include: { homeTeam: { select: { id: true, name: true, season: true } } },
        orderBy: { startsAt: "asc" },
      }),
      this.prisma.training.findMany({
        where: { organizationId, startsAt: { gte: now, lt: nextMonth } },
        include: { team: { select: { id: true, name: true, season: true } } },
        orderBy: { startsAt: "asc" },
      }),
      this.prisma.player.count({ where: { organizationId } }),
      this.prisma.player.count({
        where: {
          organizationId,
          payments: { some: { status: { in: [PaymentStatus.DUE, PaymentStatus.OVERDUE] } } },
        },
      }),
    ]);

    return {
      role: Role.DIRECTOR,
      totals: { totalPlayers, playersWithDuePayments, matches: matches.length, trainings: trainings.length },
      matches,
      trainings,
    };
  }

  private async coachOverview(userId: string, organizationId: string) {
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const coach = await this.prisma.coach.findUnique({ where: { userId }, include: { teams: true } });
    const teamIds = coach?.teams.map((team) => team.teamId) ?? [];
    const teamFilter = teamIds.length ? { in: teamIds } : undefined;

    const [trainings, matches] = await this.prisma.$transaction([
      this.prisma.training.findMany({
        where: { organizationId, startsAt: { gte: now, lt: nextWeek }, ...(teamFilter ? { teamId: teamFilter } : {}) },
        include: { team: { select: { id: true, name: true, season: true } } },
        orderBy: { startsAt: "asc" },
      }),
      this.prisma.match.findMany({
        where: { organizationId, startsAt: { gte: now }, ...(teamFilter ? { homeTeamId: teamFilter } : {}) },
        include: { homeTeam: { select: { id: true, name: true, season: true } } },
        orderBy: { startsAt: "asc" },
        take: 6,
      }),
    ]);

    return { role: Role.COACH, totals: { trainings: trainings.length, matches: matches.length }, trainings, matches };
  }

  private async playerOverview(userId: string, organizationId: string) {
    const player = await this.prisma.player.findUnique({ where: { userId } });
    if (!player) return { role: Role.PLAYER, trainings: [], matches: [], payments: [] };

    const now = new Date();
    const teamFilter = player.teamId ? { teamId: player.teamId } : {};
    const matchTeamFilter = player.teamId ? { homeTeamId: player.teamId } : {};

    const [trainings, matches, payments] = await this.prisma.$transaction([
      this.prisma.training.findMany({
        where: { organizationId, startsAt: { gte: now }, ...teamFilter },
        include: { team: { select: { id: true, name: true, season: true } } },
        orderBy: { startsAt: "asc" },
        take: 8,
      }),
      this.prisma.match.findMany({
        where: { organizationId, startsAt: { gte: now }, ...matchTeamFilter },
        include: { homeTeam: { select: { id: true, name: true, season: true } } },
        orderBy: { startsAt: "asc" },
        take: 8,
      }),
      this.prisma.payment.findMany({
        where: { organizationId, playerId: player.id, status: { in: [PaymentStatus.DUE, PaymentStatus.OVERDUE] } },
        orderBy: { dueDate: "asc" },
      }),
    ]);

    return { role: Role.PLAYER, totals: { trainings: trainings.length, matches: matches.length, payments: payments.length }, trainings, matches, payments };
  }
}
