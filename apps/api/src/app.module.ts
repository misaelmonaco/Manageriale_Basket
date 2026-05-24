import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./modules/auth/auth.module";
import { CoachesModule } from "./modules/coaches/coaches.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { ExpensesModule } from "./modules/expenses/expenses.module";
import { MatchesModule } from "./modules/matches/matches.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { OverviewModule } from "./modules/overview/overview.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { PlayersModule } from "./modules/players/players.module";
import { TeamsModule } from "./modules/teams/teams.module";
import { TrainingsModule } from "./modules/trainings/trainings.module";
import { UnassignedModule } from "./modules/unassigned/unassigned.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SharedModule } from "./shared/shared.module";
import { JwtAuthGuard } from "./shared/guards/jwt-auth.guard";
import { RolesGuard } from "./shared/guards/roles.guard";
import { TenantMiddleware } from "./shared/tenant/tenant.middleware";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SharedModule,
    AuthModule,
    OrganizationsModule,
    OverviewModule,
    TeamsModule,
    PlayersModule,
    CoachesModule,
    TrainingsModule,
    MatchesModule,
    PaymentsModule,
    ExpensesModule,
    NotificationsModule,
    DocumentsModule,
    UnassignedModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard }
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes("*");
  }
}
