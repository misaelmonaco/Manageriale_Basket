import { Type } from "class-transformer";
import { IsDate, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CreateExpenseDto {
  @IsString()
  category!: string;

  @IsString()
  vendor!: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @Type(() => Date)
  @IsDate()
  spentAt!: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}
