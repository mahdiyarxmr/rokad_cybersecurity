import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import {
  BulkRecordStudentAttendanceDto,
  RecordTeacherAttendanceDto,
} from './dto/record-attendance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';
import { AppPermission } from '../../common/constants/permissions';

@ApiTags('Daily Operations — Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  // 1. Student Attendance
  @Post('students/bulk')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @RequirePermissions(AppPermission.ATTENDANCE_WRITE)
  @ApiOperation({ summary: 'ثبت سریع و گروهی (Bulk) حضور و غیاب دانش‌آموزان یک کلاس' })
  async recordStudentAttendanceBulk(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: BulkRecordStudentAttendanceDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.attendanceService.recordStudentAttendanceBulk(
      effectiveTenantId,
      userId,
      dto,
    );
  }

  @Get('classroom/:classroomId')
  @RequirePermissions(AppPermission.ATTENDANCE_READ)
  @ApiOperation({ summary: 'مشاهده لیست حضور و غیاب یک کلاس در تاریخ و زنگ مشخص' })
  async getClassroomAttendance(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('classroomId') classroomId: string,
    @Query('date') date: string,
    @Query('periodNumber') periodNumber?: number,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.attendanceService.getClassroomAttendance(
      effectiveTenantId,
      classroomId,
      date,
      periodNumber ? Number(periodNumber) : undefined,
    );
  }

  @Get('classroom/:classroomId/summary')
  @RequirePermissions(AppPermission.ATTENDANCE_READ)
  @ApiOperation({ summary: 'خلاصه آمار حضور و غیاب دانش‌آموزان یک کلاس برای دفتر نمرات' })
  async getClassroomAttendanceSummary(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('classroomId') classroomId: string,
    @Query('lessonId') lessonId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.attendanceService.getClassroomAttendanceSummary(
      effectiveTenantId,
      classroomId,
      lessonId,
    );
  }

  @Get('student/:studentId')
  @RequirePermissions(AppPermission.ATTENDANCE_READ)
  @ApiOperation({ summary: 'مشاهده سوابق و تاریخچه کامل حضور و غیاب یک دانش‌آموز' })
  async getStudentAttendanceHistory(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('studentId') studentId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.attendanceService.getStudentAttendanceHistory(
      effectiveTenantId,
      studentId,
    );
  }

  @Get('student-history')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @RequirePermissions(AppPermission.ATTENDANCE_READ)
  @ApiOperation({ summary: 'پرونده و سابقه جلسات دانش‌آموز در یک درس و کلاس (نمرات پرسش، غیبت‌ها، انضباطی و یادداشت‌ها)' })
  async getStudentSubjectHistory(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('studentId') studentId: string,
    @Query('classroomId') classroomId: string,
    @Query('lessonId') lessonId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.attendanceService.getStudentSubjectHistory(
      effectiveTenantId,
      studentId,
      classroomId,
      lessonId,
    );
  }

  @Get('my-attendance')
  @Roles(Role.STUDENT, Role.PARENT)
  @ApiOperation({ summary: 'مشاهده سوابق و تاریخچه حضور و غیاب دانش‌آموز یا فرزند والد لاگین‌شده' })
  async getMyAttendance(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.attendanceService.getMyAttendanceHistory(
      effectiveTenantId,
      userId,
      role,
    );
  }

  @Get('teacher-daily-schedule')
  @RequirePermissions(AppPermission.ATTENDANCE_READ)
  @ApiOperation({ summary: 'برنامه درسی روزانه دبیر با آمار و وضعیت ثبت حضور و غیاب هر زنگ' })
  async getTeacherDailySchedule(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('date') date: string,
    @Query('teacherId') teacherIdQuery?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.attendanceService.getTeacherDailySchedule(
      effectiveTenantId,
      userId,
      role,
      date,
      teacherIdQuery,
    );
  }

  @Get('daily-stats')
  @RequirePermissions(AppPermission.ATTENDANCE_READ)
  @ApiOperation({ summary: 'دریافت آمار کلی تردد روزانه مدرسه (حاضرین، غایبین، تاخیرها با کش ردیس)' })
  async getDailyStats(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('date') date: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.attendanceService.getDailyStats(effectiveTenantId, date);
  }

  // 2. Teacher Attendance
  @Post('teachers')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.ATTENDANCE_WRITE)
  @ApiOperation({ summary: 'ثبت ساعت ورود/خروج و مرخصی اساتید و معلمان' })
  async recordTeacherAttendance(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: RecordTeacherAttendanceDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.attendanceService.recordTeacherAttendance(
      effectiveTenantId,
      userId,
      dto,
    );
  }

  @Get('teachers')
  @RequirePermissions(AppPermission.ATTENDANCE_READ)
  @ApiOperation({ summary: 'لیست تردد اساتید در یک روز مشخص' })
  async listTeacherAttendance(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('date') date: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.attendanceService.listTeacherAttendance(effectiveTenantId, date);
  }
}
