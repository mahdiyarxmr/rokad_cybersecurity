import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { createTenantExtension } from './prisma-tenant.extension';
import { assertSafeTenantId } from '../common/security/security-policy';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  public isConnected = false;
  public client: ReturnType<typeof this.getExtendedClient>;

  constructor(private readonly tenantContext: TenantContextService) {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['error', 'warn']
          : ['error'],
    });

    this.client = this.getExtendedClient();
  }

  private getExtendedClient() {
    return this.$extends(createTenantExtension(this.tenantContext));
  }

  async onModuleInit() {
    try {
      await Promise.race([
        this.$connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout')), 10000),
        ),
      ]);
      this.isConnected = true;
      this.logger.log('Connected to PostgreSQL database');
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(`Database offline mode active: ${err?.message || err}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /** True when Prisma failed because the DB TCP connection died. */
  isConnectionError(err: unknown): boolean {
    const msg = err instanceof Error ? `${err.message} ${err.stack ?? ''}` : String(err);
    return (
      /Server has closed the connection/i.test(msg) ||
      /Connection reset/i.test(msg) ||
      /ECONNRESET/i.test(msg) ||
      /ECONNREFUSED/i.test(msg) ||
      /P1001/i.test(msg) ||
      /P1002/i.test(msg) ||
      /P1008/i.test(msg) ||
      /timed out/i.test(msg) ||
      /Connection terminated/i.test(msg) ||
      (/PrismaClientKnownRequestError/i.test(msg) && /connection/i.test(msg))
    );
  }

  /**
   * Reconnect and retry once after a dropped PostgreSQL connection.
   * Prevents refresh/login from bubbling raw Prisma 500s during Docker/network blips.
   */
  async withReconnectRetry<T>(op: () => Promise<T>): Promise<T> {
    try {
      return await op();
    } catch (err) {
      if (!this.isConnectionError(err)) throw err;
      this.logger.warn('PostgreSQL connection lost — reconnecting and retrying once');
      try {
        await this.$disconnect();
      } catch {}
      try {
        await this.$connect();
      } catch (reconnectErr: any) {
        this.logger.error(`PostgreSQL reconnect failed: ${reconnectErr?.message}`);
        throw reconnectErr;
      }
      return op();
    }
  }

  /**
   * Run a callback inside a transaction with PostgreSQL RLS tenant context set
   */
  async withRlsTransaction<T>(
    tenantId: string,
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const safeTenantId = assertSafeTenantId(tenantId);
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${safeTenantId}, true)`;
      return callback(tx);
    });
  }
}
