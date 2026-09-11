import { IsOptional, IsString, ValidateIf } from "class-validator";

export class UpdateCoachDto {
  /** Null clears the licence number without deleting the coach profile. */
  @IsOptional()
  @ValidateIf((dto: UpdateCoachDto) => dto.licenseNumber !== null)
  @IsString()
  licenseNumber?: string | null;
}
