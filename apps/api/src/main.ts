import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./shared/filters/all-exceptions.filter";
import { RequestLoggingInterceptor } from "./shared/logging/request-logging.interceptor";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const frontendUrl = config.get<string>("FRONTEND_URL");
  const allowedOrigins = new Set(
    [
      frontendUrl,
      frontendUrl?.replace("://www.", "://"),
      frontendUrl?.replace("://", "://www."),
      ...(config.get<string>("CORS_ORIGINS") ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ].filter(Boolean),
  );
  // Extra hostnames (and their subdomains) that may call the API, e.g.
  // CORS_ALLOWED_HOSTS=courtvisionmanager.pro,staging.example.com
  const allowedHosts = (config.get<string>("CORS_ALLOWED_HOSTS") ?? "courtvisionmanager.pro")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  const isAllowedOrigin = (origin: string) => {
    if (allowedOrigins.has(origin)) return true;

    try {
      const { protocol, hostname } = new URL(origin);
      if (protocol !== "https:" && hostname !== "localhost" && hostname !== "127.0.0.1") {
        return false;
      }
      const host = hostname.toLowerCase();
      return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
    } catch {
      return false;
    }
  };

  app.setGlobalPrefix("api/v1");
  // Behind Render's proxy, so req.ip and req.hostname must come from the
  // forwarded headers rather than from the socket.
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-organization-id", "x-organization-slug"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());
  app.enableShutdownHooks();

  // The API reference documents every route and DTO, so it is off by default in
  // production. Set SWAGGER_ENABLED=true to expose it deliberately.
  const swaggerEnabled =
    config.get<string>("SWAGGER_ENABLED") === "true" ||
    (config.get("NODE_ENV") !== "production" && config.get<string>("SWAGGER_ENABLED") !== "false");

  if (swaggerEnabled) {
    const swagger = new DocumentBuilder()
      .setTitle("CourtVision API")
      .setDescription("Multi-tenant basketball club management REST API")
      .setVersion("1.0")
      .addBearerAuth()
      .build();

    SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, swagger));
  }

  const port = config.get<number>("PORT", 4000);
  await app.listen(port);
  new Logger("Bootstrap").log(`API listening on port ${port} (${config.get("NODE_ENV") ?? "development"})`);
}

void bootstrap();
