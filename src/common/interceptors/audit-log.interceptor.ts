import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CreateAuditLogDto } from '../../modules/audit-log/dto/create-audit-log.dto';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private eventEmitter: EventEmitter2) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, tenant, body, ip, headers } = request;

    // Only audit state-changing actions (POST, PUT, PATCH, DELETE)
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next.handle();
    }

    const tenantId = tenant?.id || request.tenantId;

    return next.handle().pipe(
      tap((response) => {
        if (!tenantId) return;

        const auditLogPayload: CreateAuditLogDto = {
          tenantId,
          userId: user?.id,
          action: `${method} ${url}`,
          entity: this.extractEntity(url),
          newValues: body ? this.sanitizeBody(body) : undefined,
          ipAddress: ip || (headers['x-forwarded-for'] as string),
          userAgent: headers['user-agent'],
        };

        this.eventEmitter.emit('audit.log', auditLogPayload);
      }),
    );
  }

  private extractEntity(url: string): string {
    const segments = url.split('/').filter(Boolean);
    // e.g. /api/v1/auth/login -> auth
    return segments[2] || segments[1] || 'GENERAL';
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'passwordHash', 'token', 'refreshToken', 'secret'];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***';
      }
    }
    return sanitized;
  }
}
