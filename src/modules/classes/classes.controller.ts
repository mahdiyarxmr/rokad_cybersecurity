import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import {
  CreateLessonDto,
  UpdateLessonDto,
  CreateClassroomDto,
  UpdateClassroomDto,
  EnrollStudentDto,
  CreateScheduleDto,
  UpdateScheduleDto,
} from './dto/create-lesson.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';
import { AppPermission } from '../../common/constants/permissions';

@ApiTags('Classes, Lessons & Schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  // 1. Lessons
  @Get('lessons')
  @ApiOperation({ summary: 'لیست تمام دروس و کتاب‌های مدرسه' })
  async listLessons(
    @CurrentUser() user: any,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('levelId') levelId?: string,
    @Query('fieldId') fieldId?: string,
    @Query('teacherId') teacherId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.classesService.listLessons(effectiveTenantId, levelId, fieldId, user, teacherId);
  }

  @Post('lessons')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.LESSON_WRITE)
  @ApiOperation({ summary: 'ایجاد درس یا کتاب جدید' })
  async createLesson(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateLessonDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.classesService.createLesson(effectiveTenantId, dto);
  }

  @Patch('lessons/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.LESSON_WRITE)
  @ApiOperation({ summary: 'ویرایش اطلاعات درس' })
  async updateLesson(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') lessonId: string,
    @Body() dto: UpdateLessonDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.classesService.updateLesson(effectiveTenantId, lessonId, dto);
  }

  @Delete('lessons/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.LESSON_WRITE)
  @ApiOperation({ summary: 'حذف درس از مدرسه' })
  async deleteLesson(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') lessonId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.classesService.deleteLesson(effectiveTenantId, lessonId);
  }

  // 2. Classrooms
  @Get('classrooms')
  @ApiOperation({ summary: 'لیست کلاس‌های درس مدرسه' })
  async listClassrooms(
    @CurrentUser() user: any,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.classesService.listClassrooms(effectiveTenantId, academicYearId, user);
  }

  @Get('my-schedule')
  @ApiOperation({ summary: 'دریافت برنامه هفتگی اختصاصی دانش‌آموز، والد یا دبیر جاری' })
  async getMySchedule(
    @CurrentUser() user: any,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('studentId') studentId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.classesService.getMySchedule(effectiveTenantId, user, studentId);
  }

  @Get('classrooms/:id')
  @ApiOperation({ summary: 'جزئیات کامل کلاس، دانش‌آموزان ثبت‌نام‌شده و برنامه هفتگی' })
  async getClassroomDetails(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') classroomId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.classesService.getClassroomDetails(effectiveTenantId, classroomId);
  }

  @Post('classrooms')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.CLASSROOM_WRITE)
  @ApiOperation({ summary: 'ایجاد کلاس درس جدید' })
  async createClassroom(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateClassroomDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.classesService.createClassroom(effectiveTenantId, dto);
  }

  @Patch('classrooms/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.CLASSROOM_WRITE)
  @ApiOperation({ summary: 'ویرایش اطلاعات کلاس درس' })
  async updateClassroom(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') classroomId: string,
    @Body() dto: UpdateClassroomDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.classesService.updateClassroom(effectiveTenantId, classroomId, dto);
  }

  @Delete('classrooms/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.CLASSROOM_WRITE)
  @ApiOperation({ summary: 'حذف کلاس درس' })
  async deleteClassroom(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') classroomId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.classesService.deleteClassroom(effectiveTenantId, classroomId);
  }

  // 3. Class Enrollment
  @Post('enroll')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.ENROLLMENT_WRITE)
  @ApiOperation({ summary: 'ثبت‌نام دانش‌آموز در کلاس درس' })
  async enrollStudent(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: EnrollStudentDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.classesService.enrollStudent(effectiveTenantId, dto);
  }

  @Get('classrooms/:id/students')
  @ApiOperation({ summary: 'لیست دانش‌آموزان یک کلاس' })
  async listClassStudents(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') classroomId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.classesService.listEnrolledStudents(effectiveTenantId, classroomId);
  }

  // 4. Class Schedules
  @Post('schedules')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.SCHEDULE_WRITE)
  @ApiOperation({ summary: 'تعریف زنگ کلاسی در برنامه هفتگی (همراه با بررسی عدم تداخل زمانی)' })
  async createSchedule(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateScheduleDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.classesService.createSchedule(effectiveTenantId, dto);
  }

  @Get('classrooms/:id/schedule')
  @ApiOperation({ summary: 'دریافت برنامه هفتگی یک کلاس درس' })
  async getClassSchedule(
    @CurrentUser() user: any,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') classroomId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.classesService.getClassSchedule(effectiveTenantId, classroomId, user);
  }

  @Get('teachers/:teacherId/schedule')
  @ApiOperation({ summary: 'دریافت برنامه هفتگی تدریس یک معلم' })
  async getTeacherSchedule(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('teacherId') teacherId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.classesService.getTeacherSchedule(effectiveTenantId, teacherId);
  }

  @Patch('schedules/:id')
  @Put('schedules/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.SCHEDULE_WRITE)
  @ApiOperation({ summary: 'ویرایش زنگ کلاسی در برنامه هفتگی' })
  async updateSchedule(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') scheduleId: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.classesService.updateSchedule(effectiveTenantId, scheduleId, dto);
  }

  @Delete('schedules/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.SCHEDULE_WRITE)
  @ApiOperation({ summary: 'حذف یک زنگ درسی از برنامه کلاس' })
  async deleteSchedule(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') scheduleId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.classesService.deleteSchedule(effectiveTenantId, scheduleId);
  }
}
