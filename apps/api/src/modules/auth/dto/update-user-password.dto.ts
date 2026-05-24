import { IsOptional, IsString, MinLength } from "class-validator";

export class UpdateUserPasswordDto {
  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  organizationSlug?: string;
}
