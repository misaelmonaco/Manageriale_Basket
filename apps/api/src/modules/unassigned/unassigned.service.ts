import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ProfileAssignmentStatus, Role } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestUser } from "../../shared/auth/request-user.type";
import { AssignOrganizationDto } from "./dto/assign-organization.dto";
import { AssignTeamDto } from "./dto/assign-team.dto";
import { AssignableProfileType } from "./dto/profile-type.dto";
import { UnassignedRepository } from "./unassigned.repository";

@Injectable()
export class UnassignedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: UnassignedRepository,
  ) {}

  async findAll(user: RequestUser) {
    const [players, coaches] = await Promise.all([this.findPlayers(user), this.findCoaches(user)]);
    return { players, coaches };
  }

  findPlayers(user: RequestUser) {
    return this.repository.findPlayers(this.repository.playerSvincolatiWhere(this.directorOrganizationId(user)));
  }

  findCoaches(user: RequestUser) {
    return this.repository.findCoaches(this.repository.coachSvincolatiWhere(this.directorOrganizationId(user)));
  }

  async assignOrganization(user: RequestUser, profileId: string, dto: AssignOrganizationDto) {
    const organizationId = await this.targetOrganizationId(user, dto.organizationId);

    if (dto.profileType === AssignableProfileType.PLAYER) {
      return this.assignPlayerOrganization(user, profileId, organizationId);
    }

    return this.assignCoachOrganization(user, profileId, organizationId);
  }

  async assignTeam(user: RequestUser, profileId: string, dto: AssignTeamDto) {
    const team = await this.prisma.team.findUnique({ where: { id: dto.teamId } });
    if (!team) throw new NotFoundException("Team not found.");

    const organizationId = await this.targetOrganizationId(user, dto.organizationId ?? team.organizationId);
    if (team.organizationId !== organizationId) {
      throw new ForbiddenException("Team does not belong to the target organization.");
    }

    if (dto.profileType === AssignableProfileType.PLAYER) {
      return this.assignPlayerTeam(user, profileId, organizationId, team.id);
    }

    return this.assignCoachTeam(user, profileId, organizationId, team.id);
  }

  private directorOrganizationId(user: RequestUser) {
    if (user.role === Role.SUPER_ADMIN) return undefined;
    if (!user.organizationId) throw new ForbiddenException("User is not attached to an organization.");
    return user.organizationId;
  }

  private async targetOrganizationId(user: RequestUser, requestedOrganizationId?: string) {
    if (user.role === Role.DIRECTOR) {
      if (!user.organizationId) throw new ForbiddenException("User is not attached to an organization.");
      return user.organizationId;
    }

    if (!requestedOrganizationId) {
      throw new BadRequestException("organizationId is required for SUPER_ADMIN assignments.");
    }

    const organization = await this.prisma.organization.findUnique({ where: { id: requestedOrganizationId } });
    if (!organization) throw new NotFoundException("Organization not found.");
    return organization.id;
  }

  private assertDirectorCanUseProfile(user: RequestUser, profileOrganizationId: string | null) {
    if (user.role !== Role.DIRECTOR) return;
    if (!user.organizationId) throw new ForbiddenException("User is not attached to an organization.");
    if (profileOrganizationId && profileOrganizationId !== user.organizationId) {
      throw new ForbiddenException("You cannot assign profiles from another organization.");
    }
  }

  private assertPlayerIsSvincolato(player: { assignmentStatus: ProfileAssignmentStatus; organizationId: string | null; teamId: string | null }) {
    if (player.assignmentStatus !== ProfileAssignmentStatus.UNASSIGNED && player.organizationId && player.teamId) {
      throw new BadRequestException("Player profile is already assigned to a team.");
    }
  }

  private assertCoachIsSvincolato(coach: { assignmentStatus: ProfileAssignmentStatus; organizationId: string | null; teams: unknown[] }) {
    if (coach.assignmentStatus !== ProfileAssignmentStatus.UNASSIGNED && coach.organizationId && coach.teams.length > 0) {
      throw new BadRequestException("Coach profile is already assigned to a team.");
    }
  }

  private async assignPlayerOrganization(user: RequestUser, profileId: string, organizationId: string) {
    const player = await this.prisma.player.findUnique({ where: { id: profileId }, include: { user: true } });
    if (!player) throw new NotFoundException("Player profile not found.");
    if (!player.userId) throw new BadRequestException("Player profile is not linked to a user.");
    this.assertDirectorCanUseProfile(user, player.organizationId);
    this.assertPlayerIsSvincolato(player);

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: player.userId! }, data: { organizationId } });
      return tx.player.update({
        where: { id: profileId },
        data: {
          organizationId,
          teamId: null,
          assignmentStatus: ProfileAssignmentStatus.ASSIGNED,
        },
        include: { user: true, organization: true, team: true },
      });
    });
  }

  private async assignCoachOrganization(user: RequestUser, profileId: string, organizationId: string) {
    const coach = await this.prisma.coach.findUnique({ where: { id: profileId }, include: { user: true, teams: true } });
    if (!coach) throw new NotFoundException("Coach profile not found.");
    this.assertDirectorCanUseProfile(user, coach.organizationId);
    this.assertCoachIsSvincolato(coach);

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: coach.userId }, data: { organizationId } });
      await tx.coachTeam.deleteMany({ where: { coachId: profileId, team: { organizationId: { not: organizationId } } } });
      return tx.coach.update({
        where: { id: profileId },
        data: {
          organizationId,
          assignmentStatus: ProfileAssignmentStatus.ASSIGNED,
        },
        include: { user: true, organization: true, teams: { include: { team: true } } },
      });
    });
  }

  private async assignPlayerTeam(user: RequestUser, profileId: string, organizationId: string, teamId: string) {
    const player = await this.prisma.player.findUnique({ where: { id: profileId } });
    if (!player) throw new NotFoundException("Player profile not found.");
    if (!player.userId) throw new BadRequestException("Player profile is not linked to a user.");
    this.assertDirectorCanUseProfile(user, player.organizationId);
    this.assertPlayerIsSvincolato(player);

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: player.userId! }, data: { organizationId } });
      return tx.player.update({
        where: { id: profileId },
        data: {
          organizationId,
          teamId,
          assignmentStatus: ProfileAssignmentStatus.ASSIGNED,
        },
        include: { user: true, organization: true, team: true },
      });
    });
  }

  private async assignCoachTeam(user: RequestUser, profileId: string, organizationId: string, teamId: string) {
    const coach = await this.prisma.coach.findUnique({ where: { id: profileId }, include: { teams: true } });
    if (!coach) throw new NotFoundException("Coach profile not found.");
    this.assertDirectorCanUseProfile(user, coach.organizationId);
    this.assertCoachIsSvincolato(coach);

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: coach.userId }, data: { organizationId } });
      await tx.coach.update({
        where: { id: profileId },
        data: {
          organizationId,
          assignmentStatus: ProfileAssignmentStatus.ASSIGNED,
        },
      });
      await tx.coachTeam.upsert({
        where: { coachId_teamId: { coachId: profileId, teamId } },
        update: {},
        create: { coachId: profileId, teamId },
      });

      return tx.coach.findUniqueOrThrow({
        where: { id: profileId },
        include: { user: true, organization: true, teams: { include: { team: true } } },
      });
    });
  }
}
