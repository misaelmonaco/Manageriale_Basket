import { BadRequestException, ConflictException, ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Role } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestUser } from "../../shared/auth/request-user.type";
import { PageQueryDto } from "../../shared/pagination/page-query.dto";
import { TenantService } from "../../shared/tenant/tenant.service";
import { CreatePlayerDto } from "./dto/create-player.dto";
import { PlayersRepository } from "./players.repository";

@Injectable()
export class PlayersService {
  constructor(
    private readonly repository: PlayersRepository,
    private readonly tenant: TenantService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {}

  async findAll(user: RequestUser, query: PageQueryDto) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    const [data, total] = await Promise.all([this.repository.findMany(organizationId, query), this.repository.count(organizationId)]);
    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async findOne(user: RequestUser, id: string) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    return this.repository.findOne(id, organizationId);
  }

  async create(user: RequestUser, dto: CreatePlayerDto) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user, dto.organizationSlug);
    const userId = dto.userId ?? (await this.createLinkedUser(organizationId, dto));
    const { organizationSlug, username, email, password, firstName, lastName, ...playerDto } = dto;
    void organizationSlug;
    void username;
    void email;
    void password;
    void firstName;
    void lastName;
    await this.assertTenantRelations(organizationId, { ...playerDto, userId });
    return this.repository.create({ ...playerDto, userId, organizationId });
  }

  async remove(user: RequestUser, id: string) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    return this.repository.delete(id, organizationId);
  }

  private async assertTenantRelations(organizationId: string, dto: CreatePlayerDto) {
    if (dto.userId && (await this.repository.countTenantUsers(organizationId, [dto.userId])) !== 1) {
      throw new ForbiddenException("User does not belong to this organization.");
    }

    if (dto.teamId && (await this.repository.countTenantTeams(organizationId, [dto.teamId])) !== 1) {
      throw new ForbiddenException("Team does not belong to this organization.");
    }
  }

  private async createLinkedUser(organizationId: string, dto: CreatePlayerDto) {
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
        passwordHash: await this.hashSecret(dto.password),
        firstName,
        lastName,
        birthDate: dto.birthDate,
        role: Role.PLAYER
      }
    });
    return created.id;
  }

  private hashSecret(value: string) {
    return bcrypt.hash(value, Number(this.config.get("BCRYPT_SALT_ROUNDS") ?? 12));
  }
}
