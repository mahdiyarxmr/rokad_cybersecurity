import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LessonPlansService } from './lesson-plans.service';
import {
  CreateLessonPlanDto,
  CreateSessionItemDto,
  UpdateSessionStatusDto,
} from './dto/create-lesson-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';

@ApiTags('LMS — Lesson Plans (طرح درس و بودجه‌بندی)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('lesson-plans')
export class LessonPlansController {
  constructor(private readonly lessonPlansService: LessonPlansService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @ApiOperation({ summary: 'ایجاد طرح درس سالانه یا ترمی جدید' })
  async createLessonPlan(
    @CurrentUser() user: any,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateLessonPlanDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.lessonPlansService.createLessonPlan(effectiveTenantId, dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'لیست طرح‌های درس مدرسه' })
  async listLessonPlans(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('lessonId') lessonId?: string,
    @Query('teacherId') teacherId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.lessonPlansService.listLessonPlans(
      effectiveTenantId,
      lessonId,
      teacherId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'مشاهده جزئیات طرح درس، لیست جلسات و درصد پیشرفت تدریس' })
  async getLessonPlanDetails(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') planId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.lessonPlansService.getLessonPlanDetails(effectiveTenantId, planId);
  }

  @Post(':id/sessions')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @ApiOperation({ summary: 'افزودن جلسه جدید به طرح درس' })
  async addSession(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') planId: string,
    @Body() dto: CreateSessionItemDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.lessonPlansService.addSession(effectiveTenantId, planId, dto);
  }

  @Patch('sessions/:sessionId/status')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @ApiOperation({ summary: 'به‌روزرسانی وضعیت تدریس جلسه (تدریس شد، در حال تدریس، نیاز به جبرانی)' })
  async updateSessionStatus(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSessionStatusDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.lessonPlansService.updateSessionStatus(
      effectiveTenantId,
      sessionId,
      dto,
    );
  }
}
