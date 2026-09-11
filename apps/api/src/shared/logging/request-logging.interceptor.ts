import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Request, Response } from "express";
import { Observable, tap } from "rxjs";

/**
 * One line per request with method, path, status and duration. Health probes
 * are skipped so uptime monitors do not drown the log.
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") return next.handle();

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    if (request.originalUrl.startsWith("/api/v1/health")) return next.handle();

    const startedAt = Date.now();
    return next.handle().pipe(
      tap({
        // Failures are logged by AllExceptionsFilter, which knows the final
        // status code; logging them here too would duplicate every error.
        next: () => {
          const response = http.getResponse<Response>();
          this.logger.log(`${request.method} ${request.originalUrl} ${response.statusCode} ${Date.now() - startedAt}ms`);
        },
      }),
    );
  }
}
