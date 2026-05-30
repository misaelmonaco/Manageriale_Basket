import { IsString, MinLength } from "class-validator";

export class UpdateOwnPasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
