import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PollsService } from './polls.service';
import {
  CreatePollDto,
  CastVoteDto,
  SubmitPollAnswersDto,
  UpdatePollStatusDto,
} from './dto/create-poll.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';
import {
  POLL_RESULTS_VIEW_ROLES,
  POLL_MANAGEMENT_ROLES,
} from './polls.permissions';

@ApiTags('Daily Operations — Polls & Surveys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Post()
  @Roles(...POLL_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'ایجاد نظرسنجی / فرم پرس‌کاد' })
  async createPoll(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreatePollDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.pollsService.createPoll(effectiveTenantId, userId, dto);
  }

  @Patch(':id/status')
  @Roles(...POLL_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'تغییر وضعیت نظرسنجی (بستن/بازگشایی/آرشیو/خروج از آرشیو)' })
  async updatePollStatus(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') pollId: string,
    @Body() dto: UpdatePollStatusDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.pollsService.updatePollStatus(effectiveTenantId, pollId, dto.action);
  }

  @Delete(':id')
  @Roles(...POLL_MANAGEMENT_ROLES)
  @ApiOperation({ summary: 'حذف نظرسنجی' })
  async deletePoll(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') pollId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.pollsService.deletePoll(effectiveTenantId, pollId);
  }

  @Get()
  @ApiOperation({ summary: 'لیست نظرسنجی‌های فعال و گذشته مدرسه' })
  async listPolls(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentUser('role') role: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.pollsService.listPolls(effectiveTenantId, userId, role);
  }

  @Get(':id/analytics')
  @Roles(...POLL_RESULTS_VIEW_ROLES)
  @ApiOperation({ summary: 'آنالیتیکس و نتایج نظرسنجی برای کاربران مجاز' })
  async getAnalytics(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentUser('role') role: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') pollId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.pollsService.getAnalytics(effectiveTenantId, pollId, role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'مشاهده سوالات، آمار و وضعیت پاسخ کاربر جاری' })
  async getPollDetails(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentUser('role') role: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') pollId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.pollsService.getPollDetails(effectiveTenantId, pollId, userId, role);
  }

  @Post(':id/answers')
  @ApiOperation({ summary: 'ثبت پاسخ مرحله‌به‌مرحله نظرسنجی' })
  async submitAnswers(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('firstName') firstName: string,
    @CurrentUser('lastName') lastName: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') pollId: string,
    @Body() dto: SubmitPollAnswersDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    const name =
      dto.respondentName ||
      `${firstName || ''} ${lastName || ''}`.trim() ||
      'کاربر';
    return this.pollsService.submitAnswers(
      effectiveTenantId,
      pollId,
      userId,
      name,
      dto,
      role,
    );
  }

  @Post(':id/vote')
  @ApiOperation({ summary: 'ثبت رأی در نظرسنجی (تک، چندانتخابی یا امتیازی)' })
  async castVote(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentUser('role') role: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') pollId: string,
    @Body() dto: CastVoteDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.pollsService.castVote(effectiveTenantId, pollId, userId, dto, role);
  }
}
