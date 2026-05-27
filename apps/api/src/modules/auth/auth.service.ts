import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { ProfileAssignmentStatus, Role, User } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestUser } from "../../shared/auth/request-user.type";
import { TenantService } from "../../shared/tenant/tenant.service";
import { RegisterDto } from "./dto/register.dto";

type JwtPayload = {
  sub: string;
  organizationId: string | null;
  email: string;
  role: Role;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly tenant: TenantService,
  ) {}

  async register(dto: RegisterDto) {
    const usersCount = await this.prisma.user.count();

    if (dto.role === Role.SUPER_ADMIN && usersCount > 0) {
      throw new ForbiddenException(
        "SUPER_ADMIN bootstrap registration is only allowed before the first user exists.",
      );
    }

    if (dto.role === Role.PARENT) {
      throw new ForbiddenException(
        "Parent registration is not available from the public registration form.",
      );
    }

    const username = dto.username.trim();
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username }] },
    });
    if (existing?.email === dto.email)
      throw new ConflictException("A user with this email already exists.");
    if (existing?.username === username)
      throw new ConflictException("A user with this username already exists.");

    const passwordHash = await this.hashSecret(dto.password);
    const userProfile = {
      username,
      birthDate: new Date(dto.birthDate),
      firstName: dto.firstName?.trim() || username,
      lastName: dto.lastName?.trim() ?? "",
    };

    if (dto.role === Role.SUPER_ADMIN) {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          ...userProfile,
          role: Role.SUPER_ADMIN,
        },
      });
      return this.issueSession(user);
    }

    if (dto.role === Role.PLAYER || dto.role === Role.COACH) {
      const requestedSlug = dto.organizationSlug?.trim();
      const organization = requestedSlug
        ? await this.prisma.organization.findUnique({
            where: { slug: requestedSlug },
          })
        : null;
      const assignmentStatus = organization
        ? ProfileAssignmentStatus.ASSIGNED
        : ProfileAssignmentStatus.UNASSIGNED;

      const user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            organizationId: organization?.id,
            email: dto.email,
            passwordHash,
            ...userProfile,
            role: dto.role,
          },
        });

        if (dto.role === Role.PLAYER) {
          await tx.player.create({
            data: {
              organizationId: organization?.id,
              userId: createdUser.id,
              birthDate: new Date(dto.birthDate),
              jerseyNumber: dto.jerseyNumber,
              assignmentStatus,
            },
          });
        }

        if (dto.role === Role.COACH) {
          await tx.coach.create({
            data: {
              organizationId: organization?.id,
              userId: createdUser.id,
              licenseNumber: dto.licenseNumber,
              assignmentStatus,
            },
          });
        }

        return createdUser;
      });

      return this.issueSession(user, {
        assignedToOrganization: Boolean(organization),
        assignmentStatus,
        organizationSlug: organization?.slug ?? null,
      });
    }

    const organizationName =
      dto.organizationName?.trim() || `Organizzazione di ${username}`;
    const organizationSlug = await this.uniqueOrganizationSlug(
      dto.organizationSlug?.trim() || username,
    );

    const user = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug: organizationSlug,
        },
      });

      const createdUser = await tx.user.create({
        data: {
          organizationId: organization.id,
          email: dto.email,
          passwordHash,
          ...userProfile,
          role: dto.role,
        },
      });

      if (dto.role === Role.PLAYER) {
        await tx.player.create({
          data: {
            organizationId: organization.id,
            userId: createdUser.id,
            birthDate: new Date(dto.birthDate),
          },
        });
      }

      if (dto.role === Role.COACH) {
        await tx.coach.create({
          data: {
            organizationId: organization.id,
            userId: createdUser.id,
          },
        });
      }

      return createdUser;
    });

    return this.issueSession(user, {
      assignedToOrganization: true,
      assignmentStatus: ProfileAssignmentStatus.ASSIGNED,
      organizationSlug,
    });
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive)
      throw new UnauthorizedException("Invalid credentials.");

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException("Invalid credentials.");

    await this.prisma.refreshToken.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
        expiresAt: { lt: new Date() },
      },
      data: { revokedAt: new Date() },
    });

    return this.issueSession(user);
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!stored || !(await bcrypt.compare(refreshToken, stored.tokenHash))) {
      throw new ForbiddenException("Refresh token is invalid or expired.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.isActive)
      throw new ForbiddenException("User is disabled or no longer exists.");

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueSession(user);
  }

  async logout(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { userId: payload.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        organizationId: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        organization: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async updateOwnPassword(userId: string, password: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await this.hashSecret(password) },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }

  async updateUserPassword(
    admin: RequestUser,
    userId: string,
    password: string,
    organizationSlug?: string,
  ) {
    const target = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (admin.role !== Role.SUPER_ADMIN) {
      if (
        !admin.organizationId ||
        target.organizationId !== admin.organizationId
      ) {
        throw new ForbiddenException(
          "You can only update users in your organization.",
        );
      }
    } else if (target.organizationId) {
      const organizationId = await this.tenant.resolveForUserOrSlug(
        admin,
        organizationSlug,
      );
      if (target.organizationId !== organizationId) {
        throw new ForbiddenException(
          "User does not belong to the selected organization.",
        );
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await this.hashSecret(password) },
    });

    return { success: true };
  }

  private async issueSession(
    user: User,
    profileAssignment?: {
      assignedToOrganization: boolean;
      assignmentStatus: ProfileAssignmentStatus;
      organizationSlug: string | null;
    },
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      expiresIn: this.config.get<string>("JWT_ACCESS_TTL", "15m"),
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      expiresIn: this.config.get<string>("JWT_REFRESH_TTL", "30d"),
    });

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: await this.hashSecret(refreshToken),
        expiresAt: this.refreshExpiryDate(),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        organizationId: user.organizationId,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      profileAssignment,
    };
  }

  private async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new ForbiddenException("Refresh token is invalid or expired.");
    }
  }

  private hashSecret(value: string) {
    const rounds = Number(this.config.get("BCRYPT_SALT_ROUNDS") ?? 12);
    return bcrypt.hash(value, rounds);
  }

  private refreshExpiryDate() {
    const days = Number(this.config.get("JWT_REFRESH_DAYS") ?? 30);
    return new Date(Date.now() + 1000 * 60 * 60 * 24 * days);
  }

  private async uniqueOrganizationSlug(value: string) {
    const base = value
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const slug = base || "organization";
    const existing = await this.prisma.organization.findUnique({
      where: { slug },
    });
    return existing ? `${slug}-${Date.now()}` : slug;
  }
}
