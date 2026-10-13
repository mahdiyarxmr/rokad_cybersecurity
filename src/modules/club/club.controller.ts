import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClubService } from './club.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';
import {
  ClubDepartment,
  ClubGrade,
  ClubSubmissionStatus,
} from '@prisma/client';
import {
  CreateClubChallengeDto,
  UpdateClubChallengeDto,
  CreateClubMilestoneDto,
  UpdateClubMilestoneDto,
  SubmitChallengeDto,
  GradeSubmissionDto,
  UpdateClubMembershipDto,
  TeacherApprovalDto,
} from './dto/club.dto';

@ApiTags('Rokad Business Club — باشگاه کسب‌وکار')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('club')
export class ClubController {
  constructor(private readonly clubService: ClubService) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Student Business Club Portal
  // ─────────────────────────────────────────────────────────────────────────────

  @Get('my-status')
  @Roles(Role.STUDENT, Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @ApiOperation({ summary: 'واکشی کارت عضویت، وضعیت پیشرفت رودمپ و چالش‌های دانش‌آموز' })
  async getMyClubStatus(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.clubService.getMyClubStatus(userId, effectiveTenantId);
  }

  @Get('challenges')
  @Roles(Role.STUDENT, Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @ApiOperation({ summary: 'لیست چالش‌های فعال و تعیین سطح باشگاه' })
  async getChallenges(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('department') department?: ClubDepartment,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.clubService.getChallenges(userId, effectiveTenantId, department);
  }

  @Get('challenges/:id')
  @Roles(Role.STUDENT, Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @ApiOperation({ summary: 'جزئیات صفحه تکی (Single Page) چالش' })
  async getChallengeById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.clubService.getChallengeById(id, userId, effectiveTenantId);
  }

  @Post('challenges/:id/start')
  @Roles(Role.STUDENT, Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'شروع یک چالش مهارتی (با بررسی سقف ۲ چالش فعال هم‌زمان)' })
  async startChallenge(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.clubService.startChallenge(id, userId, effectiveTenantId);
  }

  @Post('challenges/:id/submit')
  @Roles(Role.STUDENT, Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'ارسال پروژه و پاسخ نهایی چالش' })
  async submitChallenge(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: SubmitChallengeDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.clubService.submitChallenge(id, userId, effectiveTenantId, dto);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Teacher Club Approvals
  // ─────────────────────────────────────────────────────────────────────────────

  @Get('teacher/approvals')
  @Roles(Role.TEACHER, Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'لیست مایلستون‌های در انتظار تایید برای دروس معلم جاری' })
  async getTeacherPendingApprovals(
    @CurrentUser('id') teacherUserId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.clubService.getTeacherPendingApprovals(teacherUserId, effectiveTenantId);
  }

  @Post('teacher/approvals/:progressId')
  @Roles(Role.TEACHER, Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'ثبت تایید یا رد صلاحیت مایلستون باشگاه توسط معلم' })
  async submitTeacherApproval(
    @Param('progressId') progressId: string,
    @CurrentUser('id') teacherUserId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: TeacherApprovalDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.clubService.submitTeacherApproval(progressId, teacherUserId, effectiveTenantId, dto);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Admin & Club Lead Management
  // ─────────────────────────────────────────────────────────────────────────────

  @Get('admin/members')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'فهرست جامع دانش‌آموزان و اعضای باشگاه با گرید و دپارتمان' })
  async getAdminMembers(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('department') department?: ClubDepartment,
    @Query('grade') grade?: ClubGrade,
    @Query('search') search?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.clubService.getAdminMembers(effectiveTenantId, { department, grade, search });
  }

  @Patch('admin/members/:studentId')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'تغییر دستی وضعیت، گرید یا دپارتمان دانش‌آموز توسط مدیر' })
  async updateMemberStatus(
    @Param('studentId') studentId: string,
    @CurrentUser('id') adminUserId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: UpdateClubMembershipDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.clubService.updateMemberStatus(studentId, effectiveTenantId, adminUserId, dto);
  }

  @Post('admin/members/:studentId/milestones/:milestoneId/toggle')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'تیک زدن یا لغو دستی یک مایلستون در چک‌لیست دانش‌آموز' })
  async toggleStudentMilestone(
    @Param('studentId') studentId: string,
    @Param('milestoneId') milestoneId: string,
    @CurrentUser('id') adminUserId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.clubService.toggleStudentMilestone(studentId, milestoneId, effectiveTenantId, adminUserId);
  }

  // Milestones CRUD
  @Get('admin/milestones')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'دریافت لیست مراحل سازنده رودمپ پویا' })
  async getAdminMilestones(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.clubService.getAdminMilestones(effectiveTenantId);
  }

  @Post('admin/milestones')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'ایجاد یک گام جدید در رودمپ ورودی باشگاه' })
  async createMilestone(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateClubMilestoneDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.clubService.createMilestone(effectiveTenantId, dto);
  }

  @Patch('admin/milestones/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'ویرایش گام رودمپ' })
  async updateMilestone(
    @Param('id') id: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: UpdateClubMilestoneDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.clubService.updateMilestone(id, effectiveTenantId, dto);
  }

  @Delete('admin/milestones/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'حذف گام رودمپ' })
  async deleteMilestone(
    @Param('id') id: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.clubService.deleteMilestone(id, effectiveTenantId);
  }

  // Challenges CRUD
  @Get('admin/challenges')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'مدیریت و لیست کامل چالش‌ها در پنل مدیر' })
  async getAdminChallenges(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.clubService.getAdminChallenges(effectiveTenantId);
  }

  @Post('admin/challenges')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'تعریف چالش جدید برای یکی از دپارتمان‌ها' })
  async createChallenge(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateClubChallengeDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.clubService.createChallenge(effectiveTenantId, dto);
  }

  @Patch('admin/challenges/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'ویرایش چالش' })
  async updateChallenge(
    @Param('id') id: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: UpdateClubChallengeDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.clubService.updateChallenge(id, effectiveTenantId, dto);
  }

  @Delete('admin/challenges/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'حذف چالش' })
  async deleteChallenge(
    @Param('id') id: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.clubService.deleteChallenge(id, effectiveTenantId);
  }

  // Submissions Grading Hub
  @Get('admin/submissions')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'کارتابل داوری پاسخ‌های ارسالی چالش‌ها' })
  async getAdminSubmissions(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('status') status?: ClubSubmissionStatus,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.clubService.getAdminSubmissions(effectiveTenantId, status);
  }

  @Post('admin/submissions/:submissionId/grade')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'ثبت نمره ۰-۱۰۰ داور، فیدبک و تعیین گرید (A/B/C) حاصله' })
  async gradeSubmission(
    @Param('submissionId') submissionId: string,
    @CurrentUser('id') adminUserId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: GradeSubmissionDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.clubService.gradeSubmission(submissionId, effectiveTenantId, adminUserId, dto);
  }
}
