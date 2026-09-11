import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Role } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestUser } from "../../shared/auth/request-user.type";
import { TenantService } from "../../shared/tenant/tenant.service";
import { DocumentsService } from "./documents.service";

const ORG = "11111111-1111-4111-8111-111111111111";

function userWith(role: Role, sub = "user-1"): RequestUser {
  return { sub, organizationId: ORG, email: "user@example.com", role };
}

function setup(stored: { id: string; uploadedById: string } | null = { id: "doc-1", uploadedById: "owner-1" }) {
  const deleteFn = jest.fn().mockResolvedValue({});
  const prisma = {
    document: { findFirst: jest.fn().mockResolvedValue(stored), delete: deleteFn },
  } as unknown as PrismaService;
  const tenant = { resolveForUserOrSlug: jest.fn().mockResolvedValue(ORG) } as unknown as TenantService;
  return { service: new DocumentsService(prisma, tenant), deleteFn };
}

describe("DocumentsService.remove", () => {
  it("lets a director delete any document of the organization", async () => {
    const { service, deleteFn } = setup();
    await service.remove(userWith(Role.DIRECTOR), "doc-1");
    expect(deleteFn).toHaveBeenCalledWith({ where: { id: "doc-1" } });
  });

  it("lets an uploader delete their own document", async () => {
    const { service, deleteFn } = setup();
    await service.remove(userWith(Role.PLAYER, "owner-1"), "doc-1");
    expect(deleteFn).toHaveBeenCalledTimes(1);
  });

  it("refuses to delete someone else's document", async () => {
    const { service, deleteFn } = setup();
    await expect(service.remove(userWith(Role.PLAYER, "intruder"), "doc-1")).rejects.toBeInstanceOf(ForbiddenException);
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it("answers 404 for a document outside the tenant", async () => {
    const { service } = setup(null);
    await expect(service.remove(userWith(Role.DIRECTOR), "doc-1")).rejects.toBeInstanceOf(NotFoundException);
  });
});
