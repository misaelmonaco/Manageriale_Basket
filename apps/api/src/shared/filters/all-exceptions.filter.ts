import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Request, Response } from "express";

type ErrorBody = {
  statusCode: number;
  message: string | string[];
  error?: string;
  requestId?: string;
  timestamp: string;
  path: string;
};

/**
 * Single exit point for every error: turns Prisma failures into meaningful HTTP
 * codes, logs server-side faults with their stack, and never leaks an internal
 * message to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("HTTP");

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const { status, message, error } = this.describe(exception);
    const requestId = request.header("x-request-id") ?? undefined;

    const body: ErrorBody = {
      statusCode: status,
      message,
      error,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    };

    const where = `${request.method} ${request.originalUrl}`;
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // Only 5xx carries a stack: client mistakes are not operator problems.
      this.logger.error(`${where} -> ${status}`, exception instanceof Error ? exception.stack : String(exception));
    } else {
      this.logger.warn(`${where} -> ${status}: ${Array.isArray(message) ? message.join(" ") : message}`);
    }

    response.status(status).json(body);
  }

  private describe(exception: unknown): { status: number; message: string | string[]; error?: string } {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      if (typeof payload === "string") {
        return { status: exception.getStatus(), message: payload, error: exception.name };
      }

      const record = payload as { message?: string | string[]; error?: string };
      return {
        status: exception.getStatus(),
        message: record.message ?? exception.message,
        error: record.error,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.describePrisma(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return { status: HttpStatus.BAD_REQUEST, message: "Invalid query parameters.", error: "Bad Request" };
    }

    // Anything unrecognised is a bug: answer generically and log the stack.
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: "Internal server error.", error: "Internal Server Error" };
  }

  private describePrisma(exception: Prisma.PrismaClientKnownRequestError) {
    switch (exception.code) {
      case "P2002":
        return { status: HttpStatus.CONFLICT, message: "A record with these values already exists.", error: "Conflict" };
      case "P2003":
        return { status: HttpStatus.BAD_REQUEST, message: "A referenced record does not exist.", error: "Bad Request" };
      case "P2025":
        // Also covers update/delete filtered by organizationId: outside the
        // tenant the row simply does not exist.
        return { status: HttpStatus.NOT_FOUND, message: "Record not found.", error: "Not Found" };
      default:
        return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: "Database error.", error: "Internal Server Error" };
    }
  }
}
