import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RequestUser } from "../../shared/auth/request-user.type";
import { PageQueryDto } from "../../shared/pagination/page-query.dto";
import { TenantService } from "../../shared/tenant/tenant.service";
import { CreateExpenseDto } from "./dto/create-expense.dto";

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService, private readonly tenant: TenantService) {}

  async findAll(user: RequestUser, query: PageQueryDto) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({ where: { organizationId }, orderBy: { spentAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.expense.count({ where: { organizationId } })
    ]);
    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  async create(user: RequestUser, dto: CreateExpenseDto) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    return this.prisma.expense.create({ data: { ...dto, organizationId } });
  }

  async remove(user: RequestUser, id: string) {
    const organizationId = await this.tenant.resolveForUserOrSlug(user);
    return this.prisma.expense.delete({ where: { id, organizationId } });
  }
}
