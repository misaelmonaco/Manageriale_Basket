import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
  const isAllowedOrigin = (origin: string) => {
    if (allowedOrigins.has(origin)) return true;

    try {
      const { hostname } = new URL(origin);
      return (
        hostname === "courtvisionmanager.pro" ||
        hostname.endsWith(".courtvisionmanager.pro") ||
        hostname.endsWith(".onrender.com")
      );
    } catch {
      return false;
    }
  };

  app.setGlobalPrefix("api/v1");
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

  const swagger = new DocumentBuilder()
    .setTitle("CourtVision API")
    .setDescription("Multi-tenant basketball club management REST API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, swagger));

  await app.listen(config.get<number>("PORT", 4000));
}

void bootstrap();
