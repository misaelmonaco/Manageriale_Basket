import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestUser } from "../auth/request-user.type";
import { getTenantId, getTenantSlug } from "./tenant-context";

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  resolveForUser(user: RequestUser): string {
    if (user.role === "SUPER_ADMIN") {
      const tenantId = getTenantId();
      if (!tenantId) throw new ForbiddenException("SUPER_ADMIN requests must include x-organization-id.");
      return tenantId;
    }

    if (!user.organizationId) throw new ForbiddenException("User is not attached to an organization.");
    return user.organizationId;
  }

  async resolveForUserOrSlug(user: RequestUser, organizationSlug?: string): Promise<string> {
    if (user.role !== "SUPER_ADMIN") {
      if (!user.organizationId) throw new ForbiddenException("User is not attached to an organization.");
      return user.organizationId;
    }

    const slug = organizationSlug?.trim() || getTenantSlug();
    if (slug) {
      const organization = await this.prisma.organization.findUnique({ where: { slug } });
      if (!organization) throw new ForbiddenException("Organization slug was not found.");
      return organization.id;
    }

    const tenantIdOrSlug = getTenantId();
    if (!tenantIdOrSlug) {
      throw new ForbiddenException("SUPER_ADMIN requests must include x-organization-slug or x-organization-id.");
    }

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantIdOrSlug)) {
      return tenantIdOrSlug;
    }

    const organization = await this.prisma.organization.findUnique({ where: { slug: tenantIdOrSlug } });
    if (!organization) throw new ForbiddenException("Organization slug was not found.");
    return organization.id;
  }
}
