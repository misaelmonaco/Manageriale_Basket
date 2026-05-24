import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from "class-validator";
import { Type } from "class-transformer";

export class RegisterDto {
  @ApiProperty({ example: "giulia.rossi" })
  @IsString()
  username!: string;

  @ApiProperty({ example: "director@club.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ example: "Giulia" })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: "Rossi" })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: "2005-04-12" })
  @IsDateString()
  birthDate!: string;

  @ApiProperty({ enum: Role, default: Role.DIRECTOR })
  @IsEnum(Role)
  role: Role = Role.DIRECTOR;

  @ApiPropertyOptional({
    example: "Basket Roma",
    description: "Required when publicly registering a DIRECTOR tenant owner.",
  })
  @ValidateIf((dto: RegisterDto) => dto.role === Role.DIRECTOR)
  @IsOptional()
  @IsString()
  organizationName?: string;

  @ApiPropertyOptional({
    example: "basket-roma",
    description: "Creates a DIRECTOR tenant or links PLAYER/COACH profiles when the slug exists.",
  })
  @IsOptional()
  @Matches(/^[a-z0-9-]+$/)
  organizationSlug?: string;

  @ApiPropertyOptional({ example: 23, description: "Optional PLAYER jersey number." })
  @ValidateIf((dto: RegisterDto) => dto.role === Role.PLAYER)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  jerseyNumber?: number;

  @ApiPropertyOptional({ example: "FIP-12345", description: "Optional COACH license number." })
  @ValidateIf((dto: RegisterDto) => dto.role === Role.COACH)
  @IsOptional()
  @IsString()
  licenseNumber?: string;
}
