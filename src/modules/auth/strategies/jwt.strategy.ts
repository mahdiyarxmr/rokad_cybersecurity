import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AUTH_COOKIE_NAME,
  isCrossSiteFetch,
  isDownloadPath,
  resolveSecret,
} from '../../../common/security/security-policy';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: string;
  isPlatformAdmin: boolean;
  tokenUse?: 'access' | 'download' | '2fa';
  requiresTwoFactor?: boolean;
  username?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
}

function readCookie(req: Request, name: string): string | null {
  const parsed = (req as any).cookies?.[name];
  if (typeof parsed === 'string' && parsed) return parsed;
  const raw = req.headers?.cookie;
  if (!raw) return null;
  const part = raw
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  if (!part) return null;
  try {
    return decodeURIComponent(part.slice(name.length + 1));
  } catch {
    return part.slice(name.length + 1);
  }
}

function extractDownloadTicket(req: Request): string | null {
  if (!req || req.method !== 'GET') return null;
  const url = req.originalUrl || req.url || '';
  if (!isDownloadPath(url)) return null;
  const ticket = req.query?.ticket;
  return typeof ticket === 'string' && ticket ? ticket : null;
}

function extractDownloadCookie(req: Request): string | null {
  if (!req || req.method !== 'GET') return null;
  const url = req.originalUrl || req.url || '';
  if (!isDownloadPath(url)) return null;
  if (isCrossSiteFetch(req.headers['sec-fetch-site'] as string | undefined)) return null;
  return readCookie(req, AUTH_COOKIE_NAME);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        extractDownloadTicket,
        extractDownloadCookie,
      ]),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: resolveSecret(
        'JWT_ACCESS_SECRET',
        configService.get<string>('JWT_ACCESS_SECRET'),
      ),
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const url = req?.originalUrl || req?.url || '';
    const downloadRequest = req?.method === 'GET' && isDownloadPath(url);
    if (payload?.tokenUse === 'download' && !downloadRequest) {
      throw new UnauthorizedException('بلیت دانلود فقط برای دریافت فایل مجاز است');
    }
    if (req?.query?.ticket && payload?.tokenUse !== 'download') {
      throw new UnauthorizedException('بلیت دانلود نامعتبر است');
    }
    if (payload?.requiresTwoFactor || payload?.tokenUse === '2fa') {
      throw new UnauthorizedException('تکمیل احراز هویت دومرحله‌ای الزامی است');
    }
    if (!payload?.sub) {
      throw new UnauthorizedException('توکن دسترسی نامعتبر است');
    }

    if (!this.prisma.isConnected) {
      throw new UnauthorizedException('سرویس احراز هویت موقتاً در دسترس نیست');
    }

    let user: any;
    try {
      user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { tenant: true },
      });
    } catch (err: any) {
      throw new UnauthorizedException('اعتبار نشست قابل بررسی نیست');
    }

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('حساب کاربری معتبر نیست یا غیرفعال شده است');
    }
    if (user.tenant && user.tenant.status !== 'ACTIVE' && !user.isPlatformAdmin) {
      throw new UnauthorizedException('مرکز آموزشی مربوطه غیرفعال یا معلق است');
    }
    if (payload.tenantId && payload.tenantId !== user.tenantId && !user.isPlatformAdmin) {
      throw new UnauthorizedException('نشست با مرکز آموزشی حساب هم‌خوان نیست');
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isPlatformAdmin: user.isPlatformAdmin,
      twoFactorEnabled: user.twoFactorEnabled,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      tenant: user.tenant,
      tokenUse: payload.tokenUse || 'access',
    };
  }
}
