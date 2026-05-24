import { Global, Module } from "@nestjs/common";
import { TenantService } from "./tenant/tenant.service";

@Global()
@Module({
  providers: [TenantService],
  exports: [TenantService]
})
export class SharedModule {}
