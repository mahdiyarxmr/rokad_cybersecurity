import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { clearAuthCookie, setAuthCookie } from '../security/auth-cookie';

@Injectable()
export class AuthCookieInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const url = `${req.originalUrl || req.url || ''}`;

    return next.handle().pipe(
      tap((body) => {
        if (url.includes('/auth/logout')) {
          clearAuthCookie(res);
          return;
        }
        const token = body?.accessToken;
        if (typeof token === 'string' && token.length > 20) {
          setAuthCookie(res, token);
        }
      }),
    );
  }
}
