import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestUser } from "../../shared/auth/request-user.type";
import { TenantService } from "../../shared/tenant/tenant.service";
import { CreateNotificationDto } from "./dto/create-notification.dto";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly tenant: TenantService) {}

  async findAll(user: RequestUser) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    const userFilter = user.role === "DIRECTOR" || user.role === "SUPER_ADMIN" ? {} : { OR: [{ userId: user.sub }, { userId: null }] };
    return this.prisma.notification.findMany({ where: { organizationId, ...userFilter }, orderBy: { createdAt: "desc" } });
  }

  async create(user: RequestUser, dto: CreateNotificationDto) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    if (dto.userId) await this.assertUserInTenant(organizationId, dto.userId);
    return this.prisma.notification.create({ data: { ...dto, organizationId } });
  }

  async remove(user: RequestUser, id: string) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    return this.prisma.notification.delete({ where: { id, organizationId } });
  }

  private async assertUserInTenant(organizationId: string, userId: string) {
    const count = await this.prisma.user.count({ where: { id: userId, organizationId } });
    if (count !== 1) throw new ForbiddenException("User does not belong to this organization.");
  }
}
