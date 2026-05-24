import { Type } from "class-transformer";
import { IsDate, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateTrainingDto {
  @IsUUID()
  teamId!: string;

  @IsString()
  title!: string;

  @Type(() => Date)
  @IsDate()
  startsAt!: Date;

  @Type(() => Date)
  @IsDate()
  endsAt!: Date;

  @IsString()
  location!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
