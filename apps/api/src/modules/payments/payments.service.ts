import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PaymentStatus, Prisma, Role } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestUser } from "../../shared/auth/request-user.type";
import { TenantService } from "../../shared/tenant/tenant.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { PaymentQueryDto } from "./dto/payment-query.dto";

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService, private readonly tenant: TenantService) {}

  async findAll(user: RequestUser, query: PaymentQueryDto) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    if (query.playerId) await this.assertPlayerInTenant(organizationId, query.playerId);

    // The ownership clause must never be overridden by the query filter, so
    // both are combined with AND instead of being spread into one object.
    const where: Prisma.PaymentWhereInput = {
      organizationId,
      AND: [
        await this.ownershipWhere(user, organizationId),
        query.playerId ? { playerId: query.playerId } : {}
      ]
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({ where, include: { player: { include: { user: true } } }, orderBy: { dueDate: "asc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.payment.count({ where })
    ]);
    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async create(user: RequestUser, dto: CreatePaymentDto) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    await this.assertPlayerInTenant(organizationId, dto.playerId);
    return this.prisma.payment.create({ data: { ...dto, organizationId } });
  }

  async updateStatus(user: RequestUser, id: string, status: PaymentStatus) {
    if (!([PaymentStatus.DUE, PaymentStatus.PAID] as PaymentStatus[]).includes(status)) {
      throw new BadRequestException("Payment status can only be DUE or PAID from this screen.");
    }

    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    return this.prisma.payment.update({
      where: { id, organizationId },
      data: {
        status,
        paidAt: status === PaymentStatus.PAID ? new Date() : null
      },
      include: { player: { include: { user: true } } }
    });
  }

  async remove(user: RequestUser, id: string) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    return this.prisma.payment.delete({ where: { id, organizationId } });
  }

  /**
   * Players and parents may only read their own receivables. Directors and
   * super admins see every payment of the resolved organization.
   */
  private async ownershipWhere(user: RequestUser, organizationId: string): Promise<Prisma.PaymentWhereInput> {
    if (user.role === Role.SUPER_ADMIN || user.role === Role.DIRECTOR) return {};

    // An empty list yields no rows, which is the correct answer for an account
    // that has no player profile yet (e.g. a registration still unassigned).
    const playerIds = await this.ownPlayerIds(user, organizationId);
    return { playerId: { in: playerIds } };
  }

  private async ownPlayerIds(user: RequestUser, organizationId: string) {
    if (user.role === Role.PLAYER) {
      const players = await this.prisma.player.findMany({
        where: { userId: user.sub, organizationId },
        select: { id: true }
      });
      return players.map((player) => player.id);
    }

    if (user.role === Role.PARENT) {
      const links = await this.prisma.playerParent.findMany({
        where: { parentId: user.sub, player: { organizationId } },
        select: { playerId: true }
      });
      return links.map((link) => link.playerId);
    }

    throw new ForbiddenException("This role cannot read payments.");
  }

  private async assertPlayerInTenant(organizationId: string, playerId: string) {
    const count = await this.prisma.player.count({ where: { id: playerId, organizationId } });
    if (count !== 1) throw new ForbiddenException("Player does not belong to this organization.");
  }
}
