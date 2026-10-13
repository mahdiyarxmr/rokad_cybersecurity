import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY, Role } from '../constants';

export const Roles = (...roles: (Role | string)[]) => SetMetadata(ROLES_KEY, roles);
