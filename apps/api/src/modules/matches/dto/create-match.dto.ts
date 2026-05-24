import { Type } from "class-transformer";
import { IsDate, IsString, IsUUID } from "class-validator";

export class CreateMatchDto {
  @IsUUID()
  homeTeamId!: string;

  @IsString()
  opponentName!: string;

  @Type(() => Date)
  @IsDate()
  startsAt!: Date;

  @IsString()
  location!: string;
}
