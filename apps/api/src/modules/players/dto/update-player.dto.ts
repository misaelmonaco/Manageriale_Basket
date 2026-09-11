import { Type } from "class-transformer";
import { IsDate, IsInt, IsOptional, IsUUID, Min, ValidateIf } from "class-validator";

export class UpdatePlayerDto {
  /** Null detaches the player from their team without deleting the profile. */
  @IsOptional()
  @ValidateIf((dto: UpdatePlayerDto) => dto.teamId !== null)
  @IsUUID()
  teamId?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthDate?: Date;

  @IsOptional()
  @ValidateIf((dto: UpdatePlayerDto) => dto.jerseyNumber !== null)
  @IsInt()
  @Min(0)
  jerseyNumber?: number | null;

  @IsOptional()
  @ValidateIf((dto: UpdatePlayerDto) => dto.medicalExpiresAt !== null)
  @Type(() => Date)
  @IsDate()
  medicalExpiresAt?: Date | null;
}
