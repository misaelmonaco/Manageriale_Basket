import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { ProfileTypeDto } from "./profile-type.dto";

export class AssignOrganizationDto extends ProfileTypeDto {
  @ApiPropertyOptional({ description: "Required for SUPER_ADMIN. Ignored for DIRECTOR." })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
