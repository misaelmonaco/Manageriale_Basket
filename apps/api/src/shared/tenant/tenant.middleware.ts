import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { tenantStorage } from "./tenant-context";

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const organizationId = this.resolveOrganizationId(req);
    const organizationSlug = req.header("x-organization-slug")?.trim();
    tenantStorage.run({ organizationId, organizationSlug }, next);
  }

  private resolveOrganizationId(req: Request) {
    const headerTenant = req.header("x-organization-id") ?? req.header("x-tenant-id");
    if (headerTenant) return headerTenant.trim();

    const forwardedHost = req.header("x-forwarded-host");
    const hostname = (forwardedHost ?? req.hostname ?? "").split(":")[0] ?? "";
    const parts = hostname.split(".");
    return parts.length > 2 ? parts[0] : undefined;
  }
}
