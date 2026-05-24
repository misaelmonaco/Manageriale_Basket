import { IsEmail, IsObject, IsOptional, IsString, Matches } from "class-validator";

export class CreateOrganizationDto {
  @IsString()
  name!: string;

  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @IsOptional()
  @IsString()
  fiscalCode?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  subscription?: string;
}
