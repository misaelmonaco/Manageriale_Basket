import { IsOptional, IsUUID } from "class-validator";
import { PageQueryDto } from "../../../shared/pagination/page-query.dto";

export class PaymentQueryDto extends PageQueryDto {
  @IsOptional()
  @IsUUID()
  playerId?: string;
}
