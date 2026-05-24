import { ForbiddenException, Injectable } from "@nestjs/common";
import { DocumentAudience, Prisma, Role } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestUser } from "../../shared/auth/request-user.type";
import { TenantService } from "../../shared/tenant/tenant.service";
import { CreateDocumentDto } from "./dto/create-document.dto";

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService, private readonly tenant: TenantService) {}

  async findAll(user: RequestUser) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    return this.prisma.document.findMany({
      where: this.visibleWhere(user, organizationId),
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" }
    });
  }

  async create(user: RequestUser, dto: CreateDocumentDto) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    const audience = this.resolveAudience(user, dto.audience);
    return this.prisma.document.create({
      data: { ...dto, audience, uploadedById: user.sub, organizationId },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } }
    });
  }

  private resolveAudience(user: RequestUser, audience?: DocumentAudience) {
    if (user.role === Role.PLAYER) return DocumentAudience.DIRECTORS;
    if (user.role === Role.DIRECTOR || user.role === Role.SUPER_ADMIN) return audience ?? DocumentAudience.COACHES_PLAYERS;
    throw new ForbiddenException("Only directors and players can upload documents.");
  }

  private visibleWhere(user: RequestUser, organizationId: string): Prisma.DocumentWhereInput {
    if (user.role === Role.SUPER_ADMIN || user.role === Role.DIRECTOR) return { organizationId };

    if (user.role === Role.COACH) {
      return {
        organizationId,
        OR: [
          { audience: DocumentAudience.COACHES },
          { audience: DocumentAudience.COACHES_PLAYERS },
          { audience: DocumentAudience.ALL },
          { uploadedById: user.sub }
        ]
      };
    }

    if (user.role === Role.PLAYER) {
      return {
        organizationId,
        OR: [
          { audience: DocumentAudience.PLAYERS },
          { audience: DocumentAudience.COACHES_PLAYERS },
          { audience: DocumentAudience.ALL },
          { uploadedById: user.sub }
        ]
      };
    }

    return { organizationId, audience: DocumentAudience.ALL };
  }
}
