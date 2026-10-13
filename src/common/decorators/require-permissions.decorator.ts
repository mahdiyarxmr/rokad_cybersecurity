import { SetMetadata } from '@nestjs/common';
import { PERMISSION_KEY, AppPermission } from '../constants/permissions';

export const RequirePermissions = (...permissions: (AppPermission | string)[]) =>
  SetMetadata(PERMISSION_KEY, permissions);
