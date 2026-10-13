import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { SchoolCalendarService } from './school-calendar.service';
import { CreateEventDto, UpdateEventDto } from './dto/create-event.dto';
import {
  CreateEventCategoryDto,
  UpdateEventCategoryDto,
} from './dto/create-category.dto';
import {
  CreateTenantHolidayDto,
  CreateOfficialHolidayDto,
} from './dto/create-holiday.dto';
import { UpdateEventTypesDto } from './dto/update-event-types.dto';
import {
  SubmitEventIdeaDto,
  UpdateEventIdeaDto,
  UpdateEventWizardStepsDto,
  UpdateEventTeamsDto,
  SubmitEventVoteDto,
} from './dto/event-wizard.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';
import { AppPermission } from '../../common/constants/permissions';

@ApiTags('Daily Operations — Calendar & Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('calendar')
export class CalendarController {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly schoolCalendarService: SchoolCalendarService,
  ) {}

  @Get('event-types')
  @ApiOperation({ summary: 'دریافت لیست انواع رویدادهای تعریف‌شده در مدرسه' })
  async getEventTypes(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.getEventTypes(effectiveTenantId);
  }

  @Put('event-types')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.CALENDAR_WRITE)
  @ApiOperation({ summary: 'تعریف و اصلاح انواع رویدادهای مدرسه توسط مدیر' })
  async updateEventTypes(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: UpdateEventTypesDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.updateEventTypes(effectiveTenantId, dto?.eventTypes || []);
  }

  @Post('events')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.CALENDAR_WRITE)
  @ApiOperation({ summary: 'ایجاد رویداد جدید در تقویم مدرسه' })
  async createEvent(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateEventDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.createEvent(effectiveTenantId, userId, dto);
  }

  @Get('events')
  @ApiOperation({ summary: 'استعلام رویدادهای تقویم در یک بازه زمانی یا رودمپ' })
  async listEvents(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('audience') audience?: string,
    @Query('eventType') eventType?: string,
    @Query('search') search?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    if (startDate || endDate) {
      return this.calendarService.listEvents(
        effectiveTenantId,
        startDate,
        endDate,
        audience,
        userId,
        role,
        eventType,
        search,
      );
    }
    return this.calendarService.listRoadmapEvents(
      effectiveTenantId,
      eventType,
      audience,
      search,
      userId,
      role,
    );
  }

  @Get('events/:id')
  @ApiOperation({ summary: 'دریافت جزئیات کامل یک رویداد (سینگل پیج)' })
  async getEventById(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') eventId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.getEventById(effectiveTenantId, eventId);
  }

  // ==========================================
  // ویزارد و جریان کار رویداد (همگام‌سازی زنده ایده‌ها، قفل‌ها و تیم‌ها)
  // ==========================================

  @Get('events/:id/wizard-data')
  @ApiOperation({ summary: 'دریافت داده‌های زنده ویزارد رویداد (ایده‌ها، قفل مراحل و تیم‌ها)' })
  async getEventWizardData(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') eventId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.getEventWizardData(effectiveTenantId, eventId);
  }

  @Post('events/:id/ideas')
  @ApiOperation({ summary: 'ثبت ایده جدید برای رویداد توسط دانش‌آموز یا مدیر' })
  async submitEventIdea(
    @CurrentUser() user: any,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') eventId: string,
    @Body() dto: SubmitEventIdeaDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.submitEventIdea(effectiveTenantId, eventId, user, dto);
  }

  @Patch('events/:id/ideas/:ideaId')
  @ApiOperation({ summary: 'ویرایش ایده ثبت‌شده توسط نویسنده یا مدیر' })
  async updateEventIdea(
    @CurrentUser() user: any,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') eventId: string,
    @Param('ideaId') ideaId: string,
    @Body() dto: UpdateEventIdeaDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.updateEventIdea(effectiveTenantId, eventId, user, ideaId, dto);
  }

  @Delete('events/:id/ideas/:ideaId')
  @ApiOperation({ summary: 'حذف ایده ثبت‌شده توسط نویسنده یا مدیر' })
  async deleteEventIdea(
    @CurrentUser() user: any,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') eventId: string,
    @Param('ideaId') ideaId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.deleteEventIdea(effectiveTenantId, eventId, user, ideaId);
  }

  @Patch('events/:id/wizard-steps')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @ApiOperation({ summary: 'مدیریت قفل مراحل رویداد و وضعیت ثبت ایده توسط مدیر' })
  async updateEventWizardSteps(
    @CurrentUser() user: any,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') eventId: string,
    @Body() dto: UpdateEventWizardStepsDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.updateEventWizardSteps(effectiveTenantId, eventId, user, dto);
  }

  @Put('events/:id/teams')
  @ApiOperation({ summary: 'ذخیره و همگام‌سازی ترکیب تیم‌ها در سرور' })
  async updateEventTeams(
    @CurrentUser() user: any,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') eventId: string,
    @Body() dto: UpdateEventTeamsDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.updateEventTeams(effectiveTenantId, eventId, user, dto.teams);
  }

  @Post('events/:id/vote')
  @ApiOperation({ summary: 'ثبت رأی دانش‌آموز در سرور' })
  async submitEventVote(
    @CurrentUser() user: any,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') eventId: string,
    @Body() dto: SubmitEventVoteDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.submitEventVote(effectiveTenantId, eventId, user, dto.selectedOptionIds);
  }

  // ==========================================
  // دسته‌بندی‌های رویداد (Event Categories)
  // ==========================================

  @Get('event-categories')
  @ApiOperation({ summary: 'دریافت لیست دسته‌بندی‌های رویداد مدرسه' })
  async listEventCategories(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.listEventCategories(effectiveTenantId);
  }

  @Post('event-categories')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @RequirePermissions(AppPermission.CALENDAR_WRITE)
  @ApiOperation({ summary: 'ایجاد دسته‌بندی جدید رویداد' })
  async createEventCategory(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateEventCategoryDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.createEventCategory(effectiveTenantId, dto.category);
  }

  @Patch('event-categories/:key')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @RequirePermissions(AppPermission.CALENDAR_WRITE)
  @ApiOperation({ summary: 'ویرایش دسته‌بندی رویداد' })
  async updateEventCategory(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('key') key: string,
    @Body() dto: UpdateEventCategoryDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.updateEventCategory(effectiveTenantId, key, dto);
  }

  @Delete('event-categories/:key')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @RequirePermissions(AppPermission.CALENDAR_WRITE)
  @ApiOperation({ summary: 'حذف دسته‌بندی رویداد' })
  async deleteEventCategory(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('key') key: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.deleteEventCategory(effectiveTenantId, key);
  }

  @Patch('events/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.CALENDAR_WRITE)
  @ApiOperation({ summary: 'ویرایش رویداد' })
  async updateEvent(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') eventId: string,
    @Body() dto: UpdateEventDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.updateEvent(effectiveTenantId, eventId, dto);
  }

  @Get('announcements')
  @ApiOperation({ summary: 'استعلام بورد اطلاعیه‌های مدرسه با فیلتر مخاطب و کلاس' })
  async listAnnouncements(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('audience') audience?: string,
    @Query('classroomId') classroomId?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.listAnnouncements(
      effectiveTenantId,
      audience,
      classroomId,
    );
  }

  @Delete('events/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.CALENDAR_WRITE)
  @ApiOperation({ summary: 'حذف رویداد از تقویم' })
  async deleteEvent(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') eventId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.deleteEvent(effectiveTenantId, eventId);
  }

  @Patch('events/:id/restore')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @RequirePermissions(AppPermission.CALENDAR_WRITE)
  @ApiOperation({ summary: 'بازگردانی رویداد یا اطلاعیه حذف‌شده (Restore)' })
  async restoreEvent(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') eventId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.calendarService.restoreEvent(effectiveTenantId, eventId);
  }

  // ==========================================
  // معماری تقویم شمسی: روز کاری و تعطیلات
  // ==========================================

  @Get('is-working-day')
  @ApiOperation({ summary: 'بررسی وضعیت روز کاری یا تعطیلی بر اساس تقویم رسمی، تعطیلات مدرسه و جمعه‌ها' })
  async checkWorkingDay(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('date') date: string,
  ) {
    if (!date) {
      throw new BadRequestException('پارامتر date الزامی است');
    }
    const effectiveTenantId = tenantId || userTenantId;
    return this.schoolCalendarService.isWorkingDay(effectiveTenantId, date);
  }

  @Post('tenant-holidays')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'ثبت روز تعطیل اختصاصی برای مدرسه' })
  async addTenantHoliday(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateTenantHolidayDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.schoolCalendarService.addTenantHoliday(effectiveTenantId, dto);
  }

  @Get('tenant-holidays')
  @ApiOperation({ summary: 'دریافت لیست تعطیلات اختصاصی مدرسه' })
  async listTenantHolidays(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.schoolCalendarService.listTenantHolidays(effectiveTenantId);
  }

  @Delete('tenant-holidays/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'حذف تعطیلی اختصاصی مدرسه' })
  async removeTenantHoliday(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') holidayId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.schoolCalendarService.removeTenantHoliday(effectiveTenantId, holidayId);
  }

  @Post('official-holidays')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'ثبت روز تعطیل رسمی کشوری (ویژه سوپرادمین پلتفرم)' })
  async addOfficialHoliday(@Body() dto: CreateOfficialHolidayDto) {
    return this.schoolCalendarService.addOfficialHoliday(dto);
  }

  @Get('official-holidays')
  @ApiOperation({ summary: 'دریافت لیست تعطیلات رسمی سراسری کشور' })
  async listOfficialHolidays() {
    return this.schoolCalendarService.listOfficialHolidays();
  }

  @Delete('official-holidays/:id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'حذف تعطیل رسمی کشوری (ویژه سوپرادمین پلتفرم)' })
  async removeOfficialHoliday(@Param('id') holidayId: string) {
    return this.schoolCalendarService.removeOfficialHoliday(holidayId);
  }

  @Get('holidays-in-range')
  @ApiOperation({ summary: 'دریافت تقویم تجمیعی تعطیلات (رسمی و مدرسه) در یک بازه زمانی' })
  async listHolidaysInRange(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('پارامترهای startDate و endDate الزامی هستند');
    }
    const effectiveTenantId = tenantId || userTenantId;
    return this.schoolCalendarService.listHolidaysInRange(effectiveTenantId, startDate, endDate);
  }
}
