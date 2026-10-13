import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoachingService } from './coaching.service';
import {
  AssignCoachDto,
  UpdateSessionDto,
  CreateExtraRequestDto,
  RespondExtraRequestDto,
} from './dto/coaching.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';

@ApiTags('Academic Operations — Coaching & Mentorship')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('coaching')
export class CoachingController {
  constructor(private readonly coachingService: CoachingService) {}

  @Get('my-context')
  @ApiOperation({ summary: 'دریافت زمینه و وضعیت جاری کوچینگ متناسب با نقش کاربر' })
  async getMyCoachingContext(
    @CurrentUser() user: any,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.coachingService.getMyCoachingContext(effectiveTenantId, user);
  }

  @Get('today')
  @Roles(Role.COACH, Role.TEACHER, Role.STAFF, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'دریافت جلسات روز جاری کوچ جهت ثبت حضور و غیاب' })
  async getCoachTodaySessions(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.coachingService.getCoachTodaySessions(effectiveTenantId, userId);
  }

  @Get('students')
  @Roles(Role.COACH, Role.TEACHER, Role.STAFF, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'دریافت لیست دانش‌آموزان تخصیص‌یافته به کوچ' })
  async getCoachStudents(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.coachingService.getCoachStudents(effectiveTenantId, userId);
  }

  @Get('students/:id/report')
  @ApiOperation({ summary: 'دریافت گزارش جامع و پرونده مربی‌گری دانش‌آموز' })
  async getStudentDossierReport(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') studentId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.coachingService.getStudentDossierReport(effectiveTenantId, studentId);
  }

  @Post('assign')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'تخصیص کوچ به دانش‌آموز با برنامه هفتگی ثابت دو هفته یک‌بار' })
  async assignCoach(
    @CurrentUser('id') adminId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: AssignCoachDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.coachingService.assignCoach(effectiveTenantId, adminId, dto);
  }

  @Patch('sessions/:id')
  @Roles(Role.COACH, Role.TEACHER, Role.STAFF, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'ثبت حضور و غیاب و یادداشت‌های جلسه توسط کوچ' })
  async updateSessionAttendanceAndNotes(
    @CurrentUser('id') coachId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') sessionId: string,
    @Body() dto: UpdateSessionDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.coachingService.updateSessionAttendanceAndNotes(
      effectiveTenantId,
      sessionId,
      coachId,
      dto,
    );
  }

  @Post('extra-request')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'ثبت درخواست جلسه فوق‌العاده توسط دانش‌آموز' })
  async requestExtraSession(
    @CurrentUser('id') studentId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateExtraRequestDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.coachingService.requestExtraSession(effectiveTenantId, studentId, dto);
  }

  @Post('extra-requests/:id/respond')
  @Roles(Role.COACH, Role.TEACHER, Role.STAFF, Role.SCHOOL_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'پاسخ و زمان‌بندی جلسه فوق‌العاده توسط کوچ' })
  async respondToExtraRequest(
    @CurrentUser('id') coachId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') requestId: string,
    @Body() dto: RespondExtraRequestDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.coachingService.respondToExtraRequest(
      effectiveTenantId,
      coachId,
      requestId,
      dto,
    );
  }

  @Get('coaches')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'دریافت لیست مربیان و پرسنل واجد شرایط کوچینگ' })
  async listAvailableCoaches(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.coachingService.listAvailableCoaches(effectiveTenantId);
  }

  @Get('students-directory')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'دریافت فهرست دانش‌آموزان جهت انتساب کوچ' })
  async listStudentsForAssignment(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.coachingService.listStudentsForAssignment(effectiveTenantId);
  }
}
