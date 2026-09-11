import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestUser } from "../../shared/auth/request-user.type";
import { TenantService } from "../../shared/tenant/tenant.service";
import { TrainingsService } from "./trainings.service";

const ORG = "11111111-1111-4111-8111-111111111111";
const TEAM = "22222222-2222-4222-8222-222222222222";

const user: RequestUser = { sub: "user-1", organizationId: ORG, email: "d@example.com", role: "DIRECTOR" };

function setup(stored = { startsAt: new Date("2026-01-10T18:00:00Z"), endsAt: new Date("2026-01-10T20:00:00Z") }) {
  const update = jest.fn().mockResolvedValue({});
  const create = jest.fn().mockResolvedValue({});
  const prisma = {
    training: { update, create, findUniqueOrThrow: jest.fn().mockResolvedValue(stored) },
    team: { count: jest.fn().mockResolvedValue(1) },
  } as unknown as PrismaService;
  const tenant = { resolveForUserOrSlug: jest.fn().mockResolvedValue(ORG) } as unknown as TenantService;
  return { service: new TrainingsService(prisma, tenant), update, create };
}

describe("TrainingsService", () => {
  it("rejects a training that ends before it starts", async () => {
    const { service, create } = setup();

    await expect(
      service.create(user, {
        teamId: TEAM,
        title: "Tecnica",
        startsAt: new Date("2026-01-10T20:00:00Z"),
        endsAt: new Date("2026-01-10T18:00:00Z"),
        location: "Palestra",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects a zero-length training", async () => {
    const { service } = setup();
    const sameMoment = new Date("2026-01-10T18:00:00Z");

    await expect(
      service.create(user, { teamId: TEAM, title: "Tecnica", startsAt: sameMoment, endsAt: sameMoment, location: "Palestra" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("checks a partial update against the stored bounds", async () => {
    // Only the end moves, and it would land before the stored start.
    const { service, update } = setup();

    await expect(service.update(user, "training-1", { endsAt: new Date("2026-01-10T17:00:00Z") })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("accepts a partial update that stays chronological", async () => {
    const { service, update } = setup();

    await service.update(user, "training-1", { endsAt: new Date("2026-01-10T21:00:00Z") });

    expect(update).toHaveBeenCalledTimes(1);
  });
});
