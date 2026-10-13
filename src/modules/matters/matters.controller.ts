import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MattersService } from './matters.service';
import { CreateMatterDto } from './dto/create-matter.dto';
import { UpdateMatterDto } from './dto/update-matter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';

@ApiTags('Daily Operations — Disciplinary & Commendations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('matters')
export class MattersController {
  constructor(private readonly mattersService: MattersService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @ApiOperation({ summary: 'ثبت مورد انضباطی یا تشویقی جدید برای دانش‌آموز' })
  async createMatter(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateMatterDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.mattersService.createMatter(effectiveTenantId, userId, dto);
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: 'مشاهده پرونده انضباطی، تشویق‌ها و مجموع امتیازات یک دانش‌آموز' })
  async getStudentMatters(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('studentId') studentId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.mattersService.getStudentMatters(effectiveTenantId, studentId);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF, Role.TEACHER)
  @ApiOperation({ summary: 'لیست تمام موارد انضباطی و تشویقی مدرسه (قابل مشاهده توسط مدیر، کادر و معلمان)' })
  async listMatters(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('type') type?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.mattersService.listMatters(effectiveTenantId, type);
  }

  @Get('my-matters')
  @ApiOperation({ summary: 'مشاهده موارد انضباطی و تشویقی من (دانش‌آموز یا فرزند ولی)' })
  async getMyMatters(
    @CurrentUser() user: any,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.mattersService.getMyMatters(effectiveTenantId, user);
  }

  @Put(':id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'ویرایش مورد انضباطی یا تشویقی' })
  async updateMatter(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') matterId: string,
    @Body() dto: UpdateMatterDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.mattersService.updateMatter(effectiveTenantId, matterId, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'حذف مورد انضباطی یا تشویقی' })
  async deleteMatter(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') matterId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.mattersService.deleteMatter(effectiveTenantId, matterId);
  }
}
