import { IsEmail, IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class CreateCoachDto {
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
  @IsString()
  licenseNumber?: string;
}
