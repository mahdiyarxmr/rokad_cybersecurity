import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'خطای داخلی سرور رخ داده است';
    let error = 'Internal Server Error';
    let errors: any = undefined;

    const appVersion = (request.headers['x-app-version'] as string) || (request.headers['X-App-Version'] as string) || undefined;
    const tenantId = (request as any)?.tenant?.id || (request as any)?.tenantId;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, any>;
        message = obj.message || message;
        error = obj.error || error;
        if (Array.isArray(obj.message)) {
          errors = obj.message;
          message = 'خطای اعتبارسنجی داده‌های ورودی';
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled Exception [Client-Version: ${appVersion || 'unknown'}]: ${exception.message}`,
        exception.stack,
      );
      // Never leak raw Prisma/infra messages to client in production
      message = process.env.NODE_ENV === 'production' ? 'خطای داخلی سرور رخ داده است' : exception.message;
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
      tenantId: tenantId || undefined,
      appVersion: appVersion || undefined,
    });
  }
}
