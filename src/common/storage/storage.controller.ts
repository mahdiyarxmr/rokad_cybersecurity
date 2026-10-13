import {
  Controller,
  Post,
  Get,
  Head,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiProperty } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import * as fs from 'fs';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../decorators/current-tenant.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { IsNotEmpty, IsString } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import {
  AUTH_COOKIE_NAME,
  isBlockedUpload,
  isCrossSiteFetch,
  isPublicMediaModule,
  resolveCorsOrigins,
  resolveSecret,
  safeBasename,
  verifyHs256Jwt,
  verifyMediaSignature,
} from '../security/security-policy';

export class PresignedUploadDto {
  @ApiProperty({ description: 'نام ماژول', example: 'messages' })
  @IsString()
  @IsNotEmpty()
  moduleName: string;

  @ApiProperty({ description: 'نام اصلی فایل', example: 'video.mp4' })
  @IsString()
  @IsNotEmpty()
  filename: string;
}

@ApiTags('Infrastructure — Storage (ذخیره‌سازی و استریم فایل)')
@Controller('storage')
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) {}

  private mediaSecret(): string {
    return resolveSecret(
      'JWT_ACCESS_SECRET',
      this.configService.get<string>('JWT_ACCESS_SECRET'),
    );
  }

  private assertMediaAccess(req: Request, moduleName: string, tenantParam?: string) {
    const safeModule = safeBasename(moduleName);
    if (isPublicMediaModule(safeModule)) return;

    const exp = req.query.exp;
    const sig = req.query.sig;
    if (verifyMediaSignature(safeModule, safeBasename(String(req.params.filename || '')), exp, sig, this.mediaSecret())) {
      return;
    }

    const header = req.headers.authorization || '';
    const bearer = header.replace(/^Bearer\s+/i, '');
    const ticket = typeof req.query.ticket === 'string' ? req.query.ticket : '';
    const cookie = (req as any).cookies?.[AUTH_COOKIE_NAME] as string | undefined;
    const cookieAllowed = !!cookie && !isCrossSiteFetch(req.headers['sec-fetch-site'] as string | undefined);
    const token = bearer || ticket || (cookieAllowed ? cookie : '');
    if (!token) {
      throw new UnauthorizedException('برای دریافت این فایل باید وارد شده باشید');
    }

    let payload: any;
    try {
      payload = verifyHs256Jwt(token, this.mediaSecret());
    } catch {
      throw new UnauthorizedException('دسترسی به فایل نامعتبر یا منقضی است');
    }
    if (payload?.tokenUse === '2fa' || payload?.requiresTwoFactor) {
      throw new UnauthorizedException('توکن موقت احراز هویت برای دریافت فایل مجاز نیست');
    }
    if (ticket && payload?.tokenUse !== 'download') {
      throw new UnauthorizedException('بلیت دانلود نامعتبر است');
    }
    if (tenantParam && !payload?.isPlatformAdmin && payload?.tenantId !== tenantParam) {
      throw new ForbiddenException('دسترسی به فایل مرکز آموزشی دیگر مجاز نیست');
    }
  }

  private applyFileCors(req: Request, headers: Record<string, string | number>) {
    const origin = req.headers.origin;
    const allowlist = resolveCorsOrigins();
    if (origin && allowlist.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Credentials'] = 'true';
      headers['Vary'] = 'Origin';
    }
    headers['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Range, Authorization, Content-Type, Accept, Origin';
    headers['Access-Control-Expose-Headers'] = 'Content-Range, Accept-Ranges, Content-Length, Content-Type';
    headers['X-Content-Type-Options'] = 'nosniff';
    headers['Referrer-Policy'] = 'no-referrer';
    headers['Cross-Origin-Resource-Policy'] = 'cross-origin';
    headers['Cache-Control'] = 'private, max-age=300';
  }

  @Post('upload')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'آپلود مستقیم فایل و ویدیو (تا سقف ۱۵۰ مگابایت)' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 150 * 1024 * 1024 }, // 150MB
    }),
  )
  async uploadFile(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body('moduleName') moduleName: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('فایلی برای آپلود انتخاب نشده است');
    }
    if (isBlockedUpload(file.originalname, file.mimetype)) {
      throw new BadRequestException('این نوع فایل به‌دلیل ریسک امنیتی مجاز نیست');
    }
    const effectiveTenantId = tenantId || userTenantId || 'common';
    const targetModule = moduleName || 'general';

    return this.storageService.uploadFile(effectiveTenantId, targetModule, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
  }

  @Post('presigned-upload')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'دریافت مسیر آپلود فایل' })
  async getPresignedUploadUrl(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: PresignedUploadDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId || 'common';
    return this.storageService.getPresignedUploadUrl(
      effectiveTenantId,
      dto.moduleName || 'general',
      dto.filename,
      900,
    );
  }

  /**
   * Public file delivery & video streaming endpoint with HTTP Range Request (206) support
   */
  @Public()
  @Get('files/:moduleName/:filename')
  @Head('files/:moduleName/:filename')
  @ApiOperation({ summary: 'دانلود و استریم آنلاین ویدیو/فایل با پشتیبانی از HTTP 206 Range' })
  streamFile(
    @Param('moduleName') moduleName: string,
    @Param('filename') filename: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.assertMediaAccess(req, moduleName);
    const fileInfo = this.storageService.getFileInfo(moduleName, filename);
    const { fullPath, size: fileSize, mimeType } = fileInfo;

    const isHeadRequest = req.method.toUpperCase() === 'HEAD';

    const commonHeaders: Record<string, string | number> = {
      'Accept-Ranges': 'bytes',
    };
    this.applyFileCors(req, commonHeaders);

    const isDownload = req.query.download === '1' || req.query.download === 'true';
    const downloadName = (req.query.filename as string) || fileInfo.originalName || filename;
    if (isDownload) {
      commonHeaders['Content-Disposition'] = `attachment; filename="${encodeURIComponent(downloadName)}"`;
    }

    const range = req.headers.range;

    if (range) {
      // Parse Range header (e.g. "bytes=0-1048576" or "bytes=0-")
      const matches = range.match(/bytes=(\d*)-(\d*)/);
      let start = 0;
      let end = fileSize - 1;

      if (matches) {
        if (matches[1]) start = parseInt(matches[1], 10);
        if (matches[2]) end = parseInt(matches[2], 10);
      }

      if (isNaN(start) || isNaN(end) || start >= fileSize || end >= fileSize || start > end) {
        res.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE).set({
          ...commonHeaders,
          'Content-Range': `bytes */${fileSize}`,
        }).end();
        return;
      }

      const chunkSize = end - start + 1;

      res.writeHead(HttpStatus.PARTIAL_CONTENT, {
        ...commonHeaders,
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
      });

      if (isHeadRequest) {
        res.end();
        return;
      }

      const fileStream = fs.createReadStream(fullPath, { start, end });
      req.on('close', () => fileStream.destroy());
      fileStream.on('error', () => {
        if (!res.headersSent) {
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).end();
        }
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(HttpStatus.OK, {
        ...commonHeaders,
        'Content-Length': fileSize,
        'Content-Type': mimeType,
      });

      if (isHeadRequest) {
        res.end();
        return;
      }

      const fileStream = fs.createReadStream(fullPath);
      req.on('close', () => fileStream.destroy());
      fileStream.on('error', () => {
        if (!res.headersSent) {
          res.status(HttpStatus.INTERNAL_SERVER_ERROR).end();
        }
      });
      fileStream.pipe(res);
    }
  }

  /**
   * Alias endpoint supporting optional tenantId prefix in URL
   */
  @Public()
  @Get('files/:tenantId/:moduleName/:filename')
  @Head('files/:tenantId/:moduleName/:filename')
  @ApiOperation({ summary: 'دانلود و استریم آنلاین ویدیو/فایل با پیشوند تننت' })
  streamFileWithTenant(
    @Param('tenantId') tenantId: string,
    @Param('moduleName') moduleName: string,
    @Param('filename') filename: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    this.assertMediaAccess(req, moduleName, tenantId);
    return this.streamFile(moduleName, filename, req, res);
  }
}
