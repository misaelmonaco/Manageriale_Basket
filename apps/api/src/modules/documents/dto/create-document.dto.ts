import { DocumentAudience } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

export class CreateDocumentDto {
  @IsString()
  name!: string;

  @IsString()
  mimeType!: string;

  @IsString()
  storageKey!: string;

  @IsOptional()
  @IsEnum(DocumentAudience)
  audience?: DocumentAudience;
}
