import { ForbiddenException } from "@nestjs/common";
import { Role } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestUser } from "../auth/request-user.type";
import { tenantStorage } from "./tenant-context";
import { TenantService } from "./tenant.service";

const OWN_ORG = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG = "22222222-2222-4222-8222-222222222222";

function userWith(role: Role, organizationId: string | null = OWN_ORG): RequestUser {
  return { sub: "user-1", organizationId, email: "user@example.com", role };
}

function serviceWith(findUnique: jest.Mock) {
  const prisma = { organization: { findUnique } } as unknown as PrismaService;
  return new TenantService(prisma);
}

describe("TenantService", () => {
  it("ignores tenant headers for non super admins", async () => {
    const findUnique = jest.fn();
    const service = serviceWith(findUnique);

    // A director forging headers for another tenant must stay in their own.
    const resolved = await tenantStorage.run({ organizationId: OTHER_ORG, organizationSlug: "other" }, () =>
      service.resolveForUserOrSlug(userWith(Role.DIRECTOR), "other"),
    );

    expect(resolved).toBe(OWN_ORG);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("rejects a user that belongs to no organization", async () => {
    const service = serviceWith(jest.fn());
    await expect(service.resolveForUserOrSlug(userWith(Role.PLAYER, null))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("resolves the explicit slug argument for a super admin", async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: OTHER_ORG, slug: "other" });
    const service = serviceWith(findUnique);

    const resolved = await service.resolveForUserOrSlug(userWith(Role.SUPER_ADMIN, null), "other");

    expect(resolved).toBe(OTHER_ORG);
    expect(findUnique).toHaveBeenCalledWith({ where: { slug: "other" } });
  });

  it("falls back to the slug carried by the request context", async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: OTHER_ORG, slug: "from-header" });
    const service = serviceWith(findUnique);

    const resolved = await tenantStorage.run({ organizationSlug: "from-header" }, () =>
      service.resolveForUserOrSlug(userWith(Role.SUPER_ADMIN, null)),
    );

    expect(resolved).toBe(OTHER_ORG);
  });

  it("rejects a slug that does not exist", async () => {
    const service = serviceWith(jest.fn().mockResolvedValue(null));
    await expect(service.resolveForUserOrSlug(userWith(Role.SUPER_ADMIN, null), "ghost")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("verifies a header-supplied organization id against the database", async () => {
    const findUnique = jest.fn().mockResolvedValue({ id: OTHER_ORG });
    const service = serviceWith(findUnique);

    const resolved = await tenantStorage.run({ organizationId: OTHER_ORG }, () =>
      service.resolveForUserOrSlug(userWith(Role.SUPER_ADMIN, null)),
    );

    expect(resolved).toBe(OTHER_ORG);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: OTHER_ORG }, select: { id: true } });
  });

  it("rejects a well-formed organization id that no longer exists", async () => {
    const service = serviceWith(jest.fn().mockResolvedValue(null));

    await expect(
      tenantStorage.run({ organizationId: OTHER_ORG }, () => service.resolveForUserOrSlug(userWith(Role.SUPER_ADMIN, null))),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("requires a super admin to name a tenant", async () => {
    const service = serviceWith(jest.fn());

    await expect(
      tenantStorage.run({}, () => service.resolveForUserOrSlug(userWith(Role.SUPER_ADMIN, null))),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
