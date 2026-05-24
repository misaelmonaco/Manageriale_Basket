import { IsOptional, IsString } from "class-validator";

export class CreateTeamDto {
  @IsOptional()
  @IsString()
  organizationSlug?: string;

  @IsString()
  name!: string;

  @IsString()
  category!: string;

  @IsString()
  season!: string;
}
