import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@prisma/client";
import { RolesGuard } from "./roles.guard";

function contextFor(user: unknown) {
  return {
    getClass: () => class TeamsController {},
    getHandler: () => function findAll() {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guardWith(roles: Role[] | undefined) {
  const reflector = { getAllAndOverride: () => roles } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe("RolesGuard", () => {
  it("allows the request when the route declares no roles", () => {
    expect(guardWith(undefined).canActivate(contextFor({ role: Role.PLAYER }))).toBe(true);
    expect(guardWith([]).canActivate(contextFor({ role: Role.PLAYER }))).toBe(true);
  });

  it("allows a user whose role is listed", () => {
    const guard = guardWith([Role.SUPER_ADMIN, Role.DIRECTOR]);
    expect(guard.canActivate(contextFor({ role: Role.DIRECTOR }))).toBe(true);
  });

  it("rejects a user whose role is not listed", () => {
    const guard = guardWith([Role.SUPER_ADMIN, Role.DIRECTOR]);
    expect(guard.canActivate(contextFor({ role: Role.COACH }))).toBe(false);
    expect(guard.canActivate(contextFor({ role: Role.PLAYER }))).toBe(false);
    expect(guard.canActivate(contextFor({ role: Role.PARENT }))).toBe(false);
  });

  it("rejects a request that carries no authenticated user", () => {
    const guard = guardWith([Role.DIRECTOR]);
    expect(guard.canActivate(contextFor(undefined))).toBe(false);
    expect(guard.canActivate(contextFor(null))).toBe(false);
  });

  it("does not treat an unknown role string as a match", () => {
    const guard = guardWith([Role.DIRECTOR]);
    expect(guard.canActivate(contextFor({ role: "ADMIN" }))).toBe(false);
  });
});
