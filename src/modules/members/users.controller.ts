import {
  Controller,
  Get,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Role } from '../../common/constants';
import { UserRole } from '@prisma/client';

@ApiTags('Users (کاربران)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF, Role.TEACHER, Role.COACH, Role.STUDENT)
@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست نام اعضای همان مرکز آموزشی، بدون شناسه ورود' })
  @ApiQuery({ name: 'role', enum: UserRole, required: false })
  async listUsers(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('role') role?: UserRole,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('فهرست کاربران فقط داخل مرکز آموزشی مجاز است');
    }
    const where: any = {
      tenantId: effectiveTenantId,
      status: 'ACTIVE',
    };

    if (role && Object.values(UserRole).includes(role)) {
      where.role = role;
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 500,
    });
  }
}
