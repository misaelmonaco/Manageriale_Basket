import { Prisma, Role } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestUser } from "../../shared/auth/request-user.type";
import { TenantService } from "../../shared/tenant/tenant.service";
import { PaymentQueryDto } from "./dto/payment-query.dto";
import { PaymentsService } from "./payments.service";

const ORG = "11111111-1111-4111-8111-111111111111";
const OWN_PLAYER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_PLAYER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function userWith(role: Role): RequestUser {
  return { sub: "user-1", organizationId: ORG, email: "user@example.com", role };
}

function queryWith(playerId?: string): PaymentQueryDto {
  return Object.assign(new PaymentQueryDto(), { page: 1, pageSize: 25, playerId });
}

/**
 * Captures the `where` clause handed to Prisma so the tests can assert on the
 * filter itself rather than on rows from a real database.
 */
function setup() {
  const findMany = jest.fn().mockReturnValue([]);
  const count = jest.fn().mockReturnValue(0);
  const playerCount = jest.fn().mockResolvedValue(1);
  const playerFindMany = jest.fn().mockResolvedValue([{ id: OWN_PLAYER }]);
  const playerParentFindMany = jest.fn().mockResolvedValue([{ playerId: OWN_PLAYER }]);

  const prisma = {
    payment: { findMany, count },
    player: { count: playerCount, findMany: playerFindMany },
    playerParent: { findMany: playerParentFindMany },
    $transaction: (operations: unknown[]) => Promise.resolve([operations[0], operations[1]]),
  } as unknown as PrismaService;

  const tenant = { resolveForUserOrSlug: jest.fn().mockResolvedValue(ORG) } as unknown as TenantService;
  const service = new PaymentsService(prisma, tenant);

  const whereUsed = () => (findMany.mock.calls[0]?.[0] as { where: Prisma.PaymentWhereInput }).where;
  return { service, whereUsed, findMany, playerFindMany, playerParentFindMany };
}

describe("PaymentsService.findAll", () => {
  it("does not restrict a director beyond the tenant", async () => {
    const { service, whereUsed } = setup();
    await service.findAll(userWith(Role.DIRECTOR), queryWith());

    const where = whereUsed();
    expect(where.organizationId).toBe(ORG);
    expect(where.AND).toEqual([{}, {}]);
  });

  it("restricts a player to their own player profile", async () => {
    const { service, whereUsed, playerFindMany } = setup();
    await service.findAll(userWith(Role.PLAYER), queryWith());

    expect(playerFindMany).toHaveBeenCalledWith({ where: { userId: "user-1", organizationId: ORG }, select: { id: true } });
    expect(whereUsed().AND).toEqual([{ playerId: { in: [OWN_PLAYER] } }, {}]);
  });

  it("restricts a parent to the players they are linked to", async () => {
    const { service, whereUsed, playerParentFindMany } = setup();
    await service.findAll(userWith(Role.PARENT), queryWith());

    expect(playerParentFindMany).toHaveBeenCalledWith({
      where: { parentId: "user-1", player: { organizationId: ORG } },
      select: { playerId: true },
    });
    expect(whereUsed().AND).toEqual([{ playerId: { in: [OWN_PLAYER] } }, {}]);
  });

  it("keeps the ownership clause when a player asks for someone else's payments", async () => {
    const { service, whereUsed } = setup();
    await service.findAll(userWith(Role.PLAYER), queryWith(OTHER_PLAYER));

    // Both clauses survive: the AND can never resolve to another player's rows.
    expect(whereUsed().AND).toEqual([{ playerId: { in: [OWN_PLAYER] } }, { playerId: OTHER_PLAYER }]);
  });

  it("returns no rows for an account without a player profile", async () => {
    const { service, whereUsed, playerFindMany } = setup();
    playerFindMany.mockResolvedValue([]);

    await service.findAll(userWith(Role.PLAYER), queryWith());

    expect(whereUsed().AND).toEqual([{ playerId: { in: [] } }, {}]);
  });

  it("lets a director filter by any player of the tenant", async () => {
    const { service, whereUsed } = setup();
    await service.findAll(userWith(Role.DIRECTOR), queryWith(OTHER_PLAYER));

    expect(whereUsed().AND).toEqual([{}, { playerId: OTHER_PLAYER }]);
  });
});
