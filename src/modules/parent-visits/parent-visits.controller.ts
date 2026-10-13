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
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ParentVisitsService } from './parent-visits.service';
import { CreateVisitSlotDto, BookVisitDto } from './dto/create-slot.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';

@ApiTags('Daily Operations — Parent Visits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('parent-visits')
export class ParentVisitsController {
  constructor(private readonly parentVisitsService: ParentVisitsService) {}

  @Post('slots')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @ApiOperation({ summary: 'تعریف اسلات زمانی ملاقات توسط دبیر یا مشاور' })
  async createSlot(
    @CurrentUser() user: any,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateVisitSlotDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.parentVisitsService.createSlot(effectiveTenantId, dto, user);
  }

  @Delete('slots/:id')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @ApiOperation({ summary: 'حذف یا لغو اسلات زمانی ملاقات' })
  async deleteSlot(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') slotId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.parentVisitsService.deleteSlot(effectiveTenantId, slotId);
  }

  @Get('my-bookings')
  @ApiOperation({ summary: 'مشاهده لیست نوبت‌های رزروشده کاربر جاری (ولی یا معلم)' })
  async listMyBookings(
    @CurrentUser() user: any,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.parentVisitsService.listMyBookings(effectiveTenantId, user);
  }

  @Get('slots')
  @ApiOperation({ summary: 'مشاهده لیست نوبت‌های ملاقات قابل رزرو' })
  async listSlots(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Query('teacherId') teacherId?: string,
    @Query('date') date?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.parentVisitsService.listAvailableSlots(
      effectiveTenantId,
      teacherId,
      date,
    );
  }

  @Post('book')
  @Roles(Role.PARENT)
  @ApiOperation({ summary: 'رزرو نوبت ملاقات توسط ولی دانش‌آموز' })
  async bookVisit(
    @CurrentUser('id') parentUserId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: BookVisitDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.parentVisitsService.bookVisit(
      effectiveTenantId,
      parentUserId,
      dto,
    );
  }

  @Patch('bookings/:id/cancel')
  @ApiOperation({ summary: 'لغو نوبت رزروشده ملاقات' })
  async cancelBooking(
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('id') bookingId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.parentVisitsService.cancelBooking(effectiveTenantId, bookingId);
  }
}
