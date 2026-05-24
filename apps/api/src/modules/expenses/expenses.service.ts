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
    const organizationId = this.tenant.resolveForUser(user);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({ where: { organizationId }, orderBy: { spentAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.expense.count({ where: { organizationId } })
    ]);
    return { data, total, page: query.page, pageSize: query.pageSize };
  }

  create(user: RequestUser, dto: CreateExpenseDto) {
    return this.prisma.expense.create({ data: { ...dto, organizationId: this.tenant.resolveForUser(user) } });
  }

  remove(user: RequestUser, id: string) {
    const organizationId = this.tenant.resolveForUser(user);
    return this.prisma.expense.delete({ where: { id, organizationId } });
  }
}
