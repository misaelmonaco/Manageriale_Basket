import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CurrentUser } from "../../shared/auth/current-user.decorator";
import { RequestUser } from "../../shared/auth/request-user.type";
import { Roles } from "../../shared/rbac/roles.decorator";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { DocumentsService } from "./documents.service";

@ApiTags("Documents")
@ApiBearerAuth()
@Controller("documents")
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.COACH, Role.PLAYER, Role.PARENT)
  findAll(@CurrentUser() user: RequestUser) {
    return this.service.findAll(user);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.DIRECTOR, Role.PLAYER)
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateDocumentDto) {
    return this.service.create(user, dto);
  }
}
