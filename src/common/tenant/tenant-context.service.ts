import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  tenantType: string;
  isPlatformAdmin?: boolean;
  userId?: string;
}

@Injectable()
export class TenantContextService {
  private static readonly storage = new AsyncLocalStorage<TenantContext>();

  run<R>(context: TenantContext, callback: () => R): R {
    return TenantContextService.storage.run(context, callback);
  }

  getStore(): TenantContext | undefined {
    return TenantContextService.storage.getStore();
  }

  getTenantId(): string | undefined {
    return this.getStore()?.tenantId;
  }

  getTenantSlug(): string | undefined {
    return this.getStore()?.tenantSlug;
  }

  isPlatformAdmin(): boolean {
    return !!this.getStore()?.isPlatformAdmin;
  }
}
