import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { ProfileTypeDto } from "./profile-type.dto";

export class AssignTeamDto extends ProfileTypeDto {
  @ApiProperty()
  @IsUUID()
  teamId!: string;

  @ApiPropertyOptional({ description: "Optional for SUPER_ADMIN; inferred from team when omitted. Ignored for DIRECTOR." })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
