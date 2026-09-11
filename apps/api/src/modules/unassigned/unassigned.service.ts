import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ProfileAssignmentStatus, Role } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestUser } from "../../shared/auth/request-user.type";
import { MailService } from "../mail/mail.service";
import { assignmentTemplate } from "../mail/mail.templates";
import { AssignOrganizationDto } from "./dto/assign-organization.dto";
import { AssignTeamDto } from "./dto/assign-team.dto";
import { AssignableProfileType } from "./dto/profile-type.dto";
import { UnassignedRepository } from "./unassigned.repository";

type AssignmentAccount = {
  email: string;
  firstName: string | null;
  lastName: string | null;
};

type AssignmentResult = {
  organization?: { name: string } | null;
  user?: AssignmentAccount | null;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  team?: { name: string } | null;
  teams?: { team: { name: string } }[];
  directorTeams?: { team: { name: string } }[];
};

type AssignmentRecipient = {
  email: string;
  name: string;
  organizationName: string;
  teamName: string | null;
};

@Injectable()
export class UnassignedService {
  private readonly logger = new Logger(UnassignedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: UnassignedRepository,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async findAll(user: RequestUser) {
    const [players, coaches, directors] = await Promise.all([this.findPlayers(user), this.findCoaches(user), this.findDirectors(user)]);
    return { players, coaches, directors };
  }

  findPlayers(user: RequestUser) {
    return this.repository.findPlayers(this.repository.playerSvincolatiWhere(this.directorOrganizationId(user)));
  }

  findCoaches(user: RequestUser) {
    return this.repository.findCoaches(this.repository.coachSvincolatiWhere(this.directorOrganizationId(user)));
  }

  findDirectors(user: RequestUser) {
    return this.repository.findDirectors(this.repository.directorSvincolatiWhere(this.directorOrganizationId(user), user.sub));
  }

  async assignOrganization(user: RequestUser, profileId: string, dto: AssignOrganizationDto) {
    const organizationId = await this.targetOrganizationId(user, dto.organizationId);
    const assigned = await this.runOrganizationAssignment(user, profileId, organizationId, dto.profileType);
    await this.notifyAssignment(assigned);
    return assigned;
  }

  private runOrganizationAssignment(
    user: RequestUser,
    profileId: string,
    organizationId: string,
    profileType: AssignableProfileType,
  ) {
    if (profileType === AssignableProfileType.PLAYER) {
      return this.assignPlayerOrganization(user, profileId, organizationId);
    }

    if (profileType === AssignableProfileType.COACH) {
      return this.assignCoachOrganization(user, profileId, organizationId);
    }

    return this.assignDirectorOrganization(user, profileId, organizationId);
  }

  async assignTeam(user: RequestUser, profileId: string, dto: AssignTeamDto) {
    const team = await this.prisma.team.findUnique({ where: { id: dto.teamId } });
    if (!team) throw new NotFoundException("Team not found.");

    const organizationId = await this.targetOrganizationId(user, dto.organizationId ?? team.organizationId);
    if (team.organizationId !== organizationId) {
      throw new ForbiddenException("Team does not belong to the target organization.");
    }

    const assigned = await this.runTeamAssignment(user, profileId, organizationId, team.id, dto.profileType);
    await this.notifyAssignment(assigned);
    return assigned;
  }

  private runTeamAssignment(
    user: RequestUser,
    profileId: string,
    organizationId: string,
    teamId: string,
    profileType: AssignableProfileType,
  ) {
    if (profileType === AssignableProfileType.PLAYER) {
      return this.assignPlayerTeam(user, profileId, organizationId, teamId);
    }

    if (profileType === AssignableProfileType.COACH) {
      return this.assignCoachTeam(user, profileId, organizationId, teamId);
    }

    return this.assignDirectorTeam(user, profileId, organizationId, teamId);
  }

  /**
   * The three assignment paths return different shapes: a Player and a Coach
   * carry a nested `user`, while a Director *is* the user record. Both team
   * relations are optional because an organization-only assignment leaves the
   * profile without a team.
   */
  private assignmentRecipient(assigned: AssignmentResult): AssignmentRecipient | null {
    const account = assigned.user ?? assigned;
    const email = account.email;
    const organizationName = assigned.organization?.name;
    if (!email || !organizationName) return null;

    return {
      email,
      name: [account.firstName, account.lastName].filter(Boolean).join(" ") || email,
      organizationName,
      teamName: this.assignedTeamName(assigned),
    };
  }

  private assignedTeamName(assigned: AssignmentResult) {
    return assigned.team?.name ?? assigned.teams?.[0]?.team.name ?? assigned.directorTeams?.[0]?.team.name ?? null;
  }

  /** Email delivery must never roll back an assignment that already succeeded. */
  private async notifyAssignment(assigned: AssignmentResult) {
    const recipient = this.assignmentRecipient(assigned);
    if (!recipient) return;

    const loginUrl = `${this.config.get<string>("FRONTEND_URL", "http://localhost:3000").replace(/\/$/, "")}/login`;

    try {
      const result = await this.mail.send({
        to: recipient.email,
        ...assignmentTemplate(recipient.name, recipient.organizationName, recipient.teamName, loginUrl),
      });
      if (!result.sent) {
        this.logger.warn(`Assignment email to ${recipient.email} was not delivered.`);
      }
    } catch (error) {
      this.logger.error(`Assignment email to ${recipient.email} failed.`, error);
    }
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

  private assertDirectorIsSvincolato(director: { directorTeams: unknown[] }) {
    if (director.directorTeams.length > 0) {
      throw new BadRequestException("Director profile is already assigned to a team.");
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

  private async assignDirectorOrganization(user: RequestUser, profileId: string, organizationId: string) {
    const director = await this.prisma.user.findUnique({ where: { id: profileId }, include: { directorTeams: true } });
    if (!director || director.role !== Role.DIRECTOR) throw new NotFoundException("Director profile not found.");
    this.assertDirectorCanUseProfile(user, director.organizationId);
    this.assertDirectorIsSvincolato(director);

    return this.prisma.user.update({
      where: { id: profileId },
      data: { organizationId },
      include: { organization: true, directorTeams: { include: { team: true } } },
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

  private async assignDirectorTeam(user: RequestUser, profileId: string, organizationId: string, teamId: string) {
    const director = await this.prisma.user.findUnique({ where: { id: profileId }, include: { directorTeams: true } });
    if (!director || director.role !== Role.DIRECTOR) throw new NotFoundException("Director profile not found.");
    this.assertDirectorCanUseProfile(user, director.organizationId);
    this.assertDirectorIsSvincolato(director);

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: profileId },
        data: { organizationId },
      });
      await tx.directorTeam.upsert({
        where: { directorId_teamId: { directorId: profileId, teamId } },
        update: {},
        create: { directorId: profileId, teamId },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: profileId },
        include: { organization: true, directorTeams: { include: { team: true } } },
      });
    });
  }
}
