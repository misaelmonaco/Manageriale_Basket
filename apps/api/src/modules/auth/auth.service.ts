import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { ProfileAssignmentStatus, Role, User } from "@prisma/client";
import { randomBytes } from "node:crypto";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestUser } from "../../shared/auth/request-user.type";
import { TenantService } from "../../shared/tenant/tenant.service";
import { MailService } from "../mail/mail.service";
import {
  passwordResetTemplate,
  verifyEmailTemplate,
} from "../mail/mail.templates";
import { RegisterDto } from "./dto/register.dto";

type JwtPayload = {
  sub: string;
  organizationId: string | null;
  email: string;
  role: Role;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly tenant: TenantService,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const usersCount = await this.prisma.user.count();
    this.assertEmailVerificationReady();

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
      return this.registrationResponse(user);
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

      return this.registrationResponse(user, {
        assignedToOrganization: Boolean(organization),
        assignmentStatus,
        organizationSlug: organization?.slug ?? null,
      });
    }

    const requestedDirectorSlug = dto.organizationSlug?.trim();
    const existingDirectorOrganization = requestedDirectorSlug
      ? await this.prisma.organization.findUnique({
          where: { slug: requestedDirectorSlug },
        })
      : null;

    if (dto.role === Role.DIRECTOR && existingDirectorOrganization) {
      const user = await this.prisma.user.create({
        data: {
          organizationId: existingDirectorOrganization.id,
          email: dto.email,
          passwordHash,
          ...userProfile,
          role: Role.DIRECTOR,
        },
      });

      return this.registrationResponse(user, {
        assignedToOrganization: true,
        assignmentStatus: ProfileAssignmentStatus.UNASSIGNED,
        organizationSlug: existingDirectorOrganization.slug,
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

    return this.registrationResponse(user, {
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
    if (!user.emailVerifiedAt) {
      // A recent verification email is still valid: resending on every login
      // attempt would let anyone flood the address with mail.
      const throttled = await this.isWithinResendCooldown(user.id);
      const verification = throttled
        ? { sent: true }
        : await this.sendVerificationEmail(user);
      if (!verification.sent && !this.strictEmailVerification()) {
        // Email delivery is unavailable and verification is not enforced:
        // auto-verify so the user is not locked out of their account.
        this.logger.warn(
          `Auto-verifying user ${user.id} at login: the verification email could not be sent and EMAIL_VERIFICATION_REQUIRED is not enabled.`,
        );
        await this.prisma.user.update({
          where: { id: user.id },
          data: { emailVerifiedAt: new Date() },
        });
      } else {
        throw new UnauthorizedException(
          !verification.sent
            ? "Email not verified and the verification email could not be sent. Please try again later."
            : throttled
              ? "Email not verified. Check the verification email we already sent you."
              : "Email not verified. We sent you a new verification email.",
        );
      }
    }

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

  async verifyEmail(token: string) {
    const [selector, secret] = token.split(".");
    if (!selector || !secret) {
      throw new ForbiddenException("Verification link is invalid or expired.");
    }

    const candidate = await this.prisma.emailVerificationToken.findUnique({
      where: { selector },
      include: { user: true },
    });

    if (
      !candidate ||
      candidate.usedAt ||
      candidate.expiresAt <= new Date() ||
      !(await bcrypt.compare(secret, candidate.tokenHash))
    ) {
      throw new ForbiddenException("Verification link is invalid or expired.");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: candidate.userId },
        data: { emailVerifiedAt: candidate.user.emailVerifiedAt ?? new Date() },
      }),
      this.prisma.emailVerificationToken.updateMany({
        where: { userId: candidate.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    return { success: true };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always answer with a success envelope so the endpoint cannot be used to
    // enumerate registered email addresses.
    if (!user || user.emailVerifiedAt) return { success: true };
    if (await this.isWithinResendCooldown(user.id)) return { success: true };
    await this.sendVerificationEmail(user);
    return { success: true };
  }

  /**
   * Always resolves to a success envelope: a different answer for unknown or
   * already-verified addresses would turn this into an account oracle.
   */
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return { success: true };

    const recent = await this.prisma.passwordResetToken.count({
      where: { userId: user.id, createdAt: { gt: this.verificationCooldownDate() } },
    });
    if (recent > 0) return { success: true };

    const selector = randomBytes(16).toString("hex");
    const secret = randomBytes(32).toString("hex");
    const expiryMinutes = this.passwordResetExpiryMinutes();

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        selector,
        tokenHash: await this.hashSecret(secret),
        expiresAt: new Date(Date.now() + 1000 * 60 * expiryMinutes),
      },
    });

    const resetUrl = this.frontendLink(`/reset-password?token=${selector}.${secret}`);
    const result = await this.mail.send({
      to: user.email,
      ...passwordResetTemplate(this.displayName(user), resetUrl, expiryMinutes),
    });

    if (!result.sent) {
      // Never leave a usable token behind for an email that was not delivered.
      await this.prisma.passwordResetToken.deleteMany({ where: { selector } });
      this.logger.error(`Password reset email for user ${user.id} could not be sent.`);
    }

    return { success: true };
  }

  async resetPassword(token: string, password: string) {
    const [selector, secret] = token.split(".");
    if (!selector || !secret) {
      throw new ForbiddenException("Reset link is invalid or expired.");
    }

    const candidate = await this.prisma.passwordResetToken.findUnique({
      where: { selector },
      include: { user: true },
    });

    if (
      !candidate ||
      candidate.usedAt ||
      candidate.expiresAt <= new Date() ||
      !candidate.user.isActive ||
      !(await bcrypt.compare(secret, candidate.tokenHash))
    ) {
      throw new ForbiddenException("Reset link is invalid or expired.");
    }

    const passwordHash = await this.hashSecret(password);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: candidate.userId },
        // Completing a reset proves control of the mailbox, so an account that
        // was still pending verification can be confirmed here too.
        data: { passwordHash, emailVerifiedAt: candidate.user.emailVerifiedAt ?? new Date() },
      }),
      // Burn every outstanding reset token and sign existing sessions out.
      this.prisma.passwordResetToken.updateMany({
        where: { userId: candidate.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: candidate.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { success: true };
  }

  private passwordResetExpiryMinutes() {
    return Number(this.config.get("PASSWORD_RESET_EXPIRY_MINUTES") ?? 60);
  }

  private displayName(user: Pick<User, "firstName" | "lastName" | "email">) {
    return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
  }

  private frontendLink(path: string) {
    const frontendUrl = this.config.get<string>("FRONTEND_URL", "http://localhost:3000");
    return `${frontendUrl.replace(/\/$/, "")}${path}`;
  }

  private async isWithinResendCooldown(userId: string) {
    const recent = await this.prisma.emailVerificationToken.count({
      where: { userId, createdAt: { gt: this.verificationCooldownDate() } },
    });
    return recent > 0;
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

  async updateOwnPassword(
    userId: string,
    currentPassword: string,
    password: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException("Current password is not correct.");
    }

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

  private async registrationResponse(
    user: User,
    profileAssignment?: {
      assignedToOrganization: boolean;
      assignmentStatus: ProfileAssignmentStatus;
      organizationSlug: string | null;
    },
  ) {
    const emailVerification = await this.sendVerificationEmail(user);
    if (!emailVerification.sent && !this.strictEmailVerification()) {
      this.logger.warn(
        `Auto-verifying user ${user.id} at registration: the verification email could not be sent and EMAIL_VERIFICATION_REQUIRED is not enabled.`,
      );
      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
    }

    return {
      success: true,
      requiresEmailVerification:
        emailVerification.sent || this.strictEmailVerification(),
      emailVerificationSent: emailVerification.sent,
      email: user.email,
      profileAssignment,
    };
  }

  private async sendVerificationEmail(user: User) {
    const selector = randomBytes(16).toString("hex");
    const secret = randomBytes(32).toString("hex");
    const token = `${selector}.${secret}`;
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        selector,
        tokenHash: await this.hashSecret(secret),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    const verifyUrl = this.frontendLink(`/verify-email?token=${token}`);
    const sendResult = await this.mail.send({
      to: user.email,
      ...verifyEmailTemplate(this.displayName(user), verifyUrl),
    });

    if (!sendResult.sent) {
      await this.prisma.emailVerificationToken.deleteMany({
        where: { selector },
      });
    }

    return sendResult;
  }

  private assertEmailVerificationReady() {
    if (this.strictEmailVerification() && !this.mail.isConfigured()) {
      throw new ServiceUnavailableException(
        "Email verification is not configured.",
      );
    }
  }

  private strictEmailVerification() {
    // Allow overriding the strict behaviour via env var so that a broken or
    // unreachable SMTP server does not block profile creation in production.
    // EMAIL_VERIFICATION_REQUIRED=true  -> always require verification
    // EMAIL_VERIFICATION_REQUIRED=false -> never block registration/login
    // (unset) -> default to strict only in production
    const override = this.config.get<string>("EMAIL_VERIFICATION_REQUIRED");
    if (override === "true") return true;
    if (override === "false") return false;
    return this.config.get("NODE_ENV") === "production";
  }

  private verificationCooldownDate() {
    const minutes = Number(
      this.config.get("EMAIL_VERIFICATION_COOLDOWN_MINUTES") ??
        this.config.get("EMAIL_VERIFICATION_RESEND_COOLDOWN_MINUTES") ??
        5,
    );
    return new Date(Date.now() - 1000 * 60 * minutes);
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
