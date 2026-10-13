import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentTenant = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // Prioritize the authenticated user's actual tenant to guarantee strict multi-tenant isolation (e.g. boys vs girls school)
    const tenant = request.user?.tenant || (request.user?.tenantId ? { id: request.user?.tenantId } : request.tenant);
    return data ? tenant?.[data] : tenant;
  },
);
