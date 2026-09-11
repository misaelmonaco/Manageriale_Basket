import { MatchStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsDate, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min, ValidateIf } from "class-validator";

export class UpdateMatchDto {
  @IsOptional()
  @IsUUID()
  homeTeamId?: string;

  @IsOptional()
  @IsString()
  opponentName?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @IsOptional()
  @ValidateIf((dto: UpdateMatchDto) => dto.homeScore !== null)
  @IsInt()
  @Min(0)
  homeScore?: number | null;

  @IsOptional()
  @ValidateIf((dto: UpdateMatchDto) => dto.awayScore !== null)
  @IsInt()
  @Min(0)
  awayScore?: number | null;
}
