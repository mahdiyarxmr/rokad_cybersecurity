import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextService } from './tenant-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TENANT_HEADER_ID, TENANT_HEADER_SLUG } from '../constants';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(
    private readonly tenantContextService: TenantContextService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantIdentifier = this.extractTenantIdentifier(req);

    if (!tenantIdentifier) {
      // Run with default/empty context
      return this.tenantContextService.run(
        {
          tenantId: '',
          tenantSlug: '',
          tenantName: '',
          tenantType: 'UNRESOLVED',
        },
        () => next(),
      );
    }

    try {
      const tenant = await this.resolveTenant(tenantIdentifier);

      if (tenant) {
        (req as any).tenant = tenant;
        (req as any).tenantId = tenant.id;

        return this.tenantContextService.run(
          {
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            tenantName: tenant.name,
            tenantType: tenant.type,
          },
          () => next(),
        );
      }
    } catch (err: any) {
      this.logger.warn(`Failed to resolve tenant '${tenantIdentifier.value}': ${err.message}`);
    }

    // Continue with empty context if resolution did not yield tenant
    return this.tenantContextService.run(
      {
        tenantId: '',
        tenantSlug: '',
        tenantName: '',
        tenantType: 'UNRESOLVED',
      },
      () => next(),
    );
  }

  private extractTenantIdentifier(
    req: Request,
  ): { type: 'id' | 'slug' | 'subdomain' | 'domain'; value: string } | null {
    // 1. Check HTTP Headers
    const headerId = req.headers[TENANT_HEADER_ID] as string;
    if (headerId && headerId.trim() !== '') {
      return { type: 'id', value: headerId.trim() };
    }

    const headerSlug = req.headers[TENANT_HEADER_SLUG] as string;
    if (headerSlug && headerSlug.trim() !== '') {
      return { type: 'slug', value: headerSlug.trim() };
    }

    // 2. Check Query parameter
    const queryTenant = req.query['tenant'] as string;
    if (queryTenant && queryTenant.trim() !== '') {
      return { type: 'slug', value: queryTenant.trim() };
    }

    // 3. Check Hostname / Subdomain
    const host = req.headers.host || '';
    const hostname = host.split(':')[0]; // remove port

    // Localhost or IP address bypass
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.internal')
    ) {
      return null;
    }

    const parts = hostname.split('.');
    if (parts.length >= 3) {
      // e.g. boys.rokadschool.ir -> subdomain = boys
      const subdomain = parts[0];
      if (subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'app' && subdomain !== 'platform') {
        return { type: 'subdomain', value: subdomain };
      }
      return null;
    }

    // Custom domain
    return { type: 'domain', value: hostname };
  }

  private async resolveTenant(identifier: {
    type: 'id' | 'slug' | 'subdomain' | 'domain';
    value: string;
  }) {
    const cacheKey = `tenant:${identifier.type}:${identifier.value}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // invalid cache JSON
      }
    }

    let tenant: any = null;

    try {
      if (identifier.type === 'id') {
        tenant = await this.prisma.tenant.findUnique({
          where: { id: identifier.value },
        });
      } else if (identifier.type === 'slug') {
        tenant = await this.prisma.tenant.findUnique({
          where: { slug: identifier.value },
        });
      } else if (identifier.type === 'subdomain') {
        tenant = await this.prisma.tenant.findFirst({
          where: {
            OR: [{ subdomain: identifier.value }, { slug: identifier.value }],
          },
        });
      } else if (identifier.type === 'domain') {
        tenant = await this.prisma.tenant.findUnique({
          where: { customDomain: identifier.value },
        });
      }
    } catch (dbErr: any) {
      this.logger.error(`Error resolving tenant from DB for ${identifier.type}=${identifier.value}: ${dbErr?.message}`);
      return null;
    }

    if (tenant) {
      // Cache tenant info for 5 minutes (300s)
      await this.redisService.set(cacheKey, JSON.stringify(tenant), 300);
    }

    return tenant;
  }
}
