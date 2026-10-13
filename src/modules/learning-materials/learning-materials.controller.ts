import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LearningMaterialsService } from './learning-materials.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';

@ApiTags('Content — Learning Materials (جزوات و محتوای درسی)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('learning-materials')
export class LearningMaterialsController {
  constructor(
    private readonly materialsService: LearningMaterialsService,
  ) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @ApiOperation({ summary: 'ثبت و انتشار جزوه/ویدیوی جدید برای کلاس‌های درسی' })
  async createMaterial(
    @CurrentUser() user: any,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateMaterialDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.materialsService.createMaterial(effectiveTenantId, dto, user);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @ApiOperation({ summary: 'حذف جزوه یا محتوای آموزشی' })
  async deleteMaterial(
    @CurrentUser() user: any,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') materialId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.materialsService.deleteMaterial(effectiveTenantId, materialId, user);
  }

  @Get()
  @ApiOperation({ summary: 'لیست محتواها و جزوات درسی مدرسه' })
  async listMaterials(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('lessonId') lessonId?: string,
    @Query('classroomId') classroomId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.materialsService.listMaterials(effectiveTenantId, {
      lessonId,
      classroomId,
    });
  }

  @Get(':id/download-url')
  @ApiOperation({ summary: 'تولید Presigned URL دانلود امن با اعتبارسنجی سطح دسترسی و انقضای کوتاه' })
  async getSecureDownloadUrl(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') materialId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.materialsService.getSecureDownloadUrl(
      effectiveTenantId,
      materialId,
      userId,
      userRole,
    );
  }
}
