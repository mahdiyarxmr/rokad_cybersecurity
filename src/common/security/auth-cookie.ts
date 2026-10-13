import { Response } from 'express';
import { AUTH_COOKIE_NAME, isProduction } from './security-policy';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export function setAuthCookie(res: Response, accessToken: string): void {
  res.cookie(AUTH_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/api/v1',
    maxAge: FIFTEEN_MINUTES_MS,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/api/v1',
  });
}
