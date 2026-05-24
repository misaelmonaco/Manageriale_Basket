import { Type } from "class-transformer";
import { IsDate, IsEmail, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from "class-validator";

export class CreatePlayerDto {
  @IsOptional()
  @IsString()
  organizationSlug?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @Type(() => Date)
  @IsDate()
  birthDate!: Date;

  @IsOptional()
  @IsInt()
  @Min(0)
  jerseyNumber?: number;
}
