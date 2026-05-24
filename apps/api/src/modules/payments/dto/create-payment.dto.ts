import { Type } from "class-transformer";
import { IsDate, IsInt, IsString, IsUUID, Min } from "class-validator";

export class CreatePaymentDto {
  @IsUUID()
  playerId!: string;

  @IsString()
  description!: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @Type(() => Date)
  @IsDate()
  dueDate!: Date;
}
