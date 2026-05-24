import { BadRequestException, ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Role } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestUser } from "../../shared/auth/request-user.type";
import { TenantService } from "../../shared/tenant/tenant.service";
import { CreateCoachDto } from "./dto/create-coach.dto";

@Injectable()
export class CoachesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly config: ConfigService
  ) {}

  async findAll(user: RequestUser) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    return this.prisma.coach.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } }, teams: true }
    });
  }

  async create(user: RequestUser, dto: CreateCoachDto) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user, dto.organizationSlug);
    const userId = dto.userId ?? (await this.createLinkedUser(organizationId, dto));
    if (!userId) throw new BadRequestException("Coach user data is required.");
    await this.assertUserInTenant(organizationId, userId);
    return this.prisma.coach.create({ data: { userId, licenseNumber: dto.licenseNumber, organizationId } });
  }

  async remove(user: RequestUser, id: string) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    return this.prisma.coach.delete({ where: { id, organizationId } });
  }

  private async assertUserInTenant(organizationId: string, userId: string) {
    const count = await this.prisma.user.count({ where: { id: userId, organizationId } });
    if (count !== 1) throw new ForbiddenException("User does not belong to this organization.");
  }

  private async createLinkedUser(organizationId: string, dto: CreateCoachDto) {
    if (!dto.email || !dto.password) return undefined;

    const username = dto.username?.trim() || dto.email.split("@")[0];
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username }] }
    });
    if (existing) throw new ConflictException("A user with this email or username already exists.");

    const firstName = dto.firstName?.trim() || username;
    const lastName = dto.lastName?.trim() ?? "";
    if (!firstName) throw new BadRequestException("First name is required.");

    const created = await this.prisma.user.create({
      data: {
        organizationId,
        username,
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, Number(this.config.get("BCRYPT_SALT_ROUNDS") ?? 12)),
        firstName,
        lastName,
        role: Role.COACH
      }
    });
    return created.id;
  }
}
