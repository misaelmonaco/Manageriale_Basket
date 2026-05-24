import { AsyncLocalStorage } from "node:async_hooks";

export type TenantStore = {
  organizationId?: string;
  organizationSlug?: string;
};

export const tenantStorage = new AsyncLocalStorage<TenantStore>();

export const getTenantId = () => tenantStorage.getStore()?.organizationId;
export const getTenantSlug = () => tenantStorage.getStore()?.organizationSlug;
