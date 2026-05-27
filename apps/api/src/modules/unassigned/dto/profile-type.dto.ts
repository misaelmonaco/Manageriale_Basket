import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";

export enum AssignableProfileType {
  PLAYER = "PLAYER",
  COACH = "COACH",
  DIRECTOR = "DIRECTOR",
}

export class ProfileTypeDto {
  @ApiProperty({ enum: AssignableProfileType })
  @IsEnum(AssignableProfileType)
  profileType!: AssignableProfileType;
}
