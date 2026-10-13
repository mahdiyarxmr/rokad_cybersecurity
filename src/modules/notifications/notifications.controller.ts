import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService, SystemNotification } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Operations — Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'دریافت اعلان‌ها و نوتیفیکیشن‌های اختصاصی بر اساس رول کاربر' })
  async getNotifications(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser() user: any,
  ): Promise<SystemNotification[]> {
    const effectiveTenantId = tenantId || user?.tenantId;
    return this.notificationsService.getUserNotifications(effectiveTenantId, user);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'علامت‌گذاری یک اعلان به عنوان خوانده‌شده' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.notificationsService.markAsRead(userId, id);
    return { success: true };
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'علامت‌گذاری تمام اعلان‌ها به عنوان خوانده‌شده' })
  async markAllAsRead(
    @CurrentUser('id') userId: string,
    @Body('notificationIds') notificationIds: string[],
  ) {
    await this.notificationsService.markAllAsRead(userId, notificationIds || []);
    return { success: true };
  }

  @Public()
  @Get('push/public-key')
  @ApiOperation({ summary: 'دریافت کلید عمومی VAPID برای ثبت وب‌پوش' })
  getVapidPublicKey() {
    return this.notificationsService.getVapidPublicKey();
  }

  @Post('push/subscribe')
  @ApiOperation({ summary: 'ثبت یا به‌روزرسانی اشتراک وب‌پوش دستگاه کاربر' })
  async subscribePush(
    @CurrentUser('id') userId: string,
    @Body() subscriptionData: any,
    @Headers('user-agent') userAgent: string,
  ) {
    await this.notificationsService.subscribePush(userId, subscriptionData, userAgent);
    return { success: true, message: 'اشتراک اعلان با موفقیت ثبت شد' };
  }

  @Post('push/unsubscribe')
  @ApiOperation({ summary: 'حذف اشتراک وب‌پوش دستگاه' })
  async unsubscribePush(
    @CurrentUser('id') userId: string,
    @Body('endpoint') endpoint: string,
  ) {
    await this.notificationsService.unsubscribePush(userId, endpoint);
    return { success: true, message: 'اشتراک اعلان با موفقیت لغو شد' };
  }

  @Post('push/test')
  @ApiOperation({ summary: 'ارسال اعلان آزمایشی وب‌پوش برای تست دستگاه' })
  async sendTestPush(@CurrentUser('id') userId: string) {
    const result = await this.notificationsService.sendTestPush(userId);
    return { success: true, ...result };
  }

  @Post('send')
  @ApiOperation({ summary: 'ارسال اعلان سیستمی و پوش نوتیفیکیشن به کاربران یا نقش‌های مختلف' })
  async sendBroadcast(
    @CurrentTenant('id') tenantId: string,
    @CurrentUser() user: any,
    @Body()
    dto: {
      title: string;
      body: string;
      targetRole?: string;
      targetUrl?: string;
      badge?: 'default' | 'success' | 'warning' | 'destructive' | 'neutral' | 'college';
    },
  ) {
    const effectiveTenantId = tenantId || user?.tenantId;
    return this.notificationsService.sendBroadcast(effectiveTenantId, user, dto);
  }
}
