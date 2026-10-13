import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { TelegramAnchorService } from '../../common/audit-anchor/telegram-anchor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Role } from '../../common/constants';

@ApiTags('Audit Log — Immutable Security Logs')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.STAFF)
@ApiBearerAuth()
export class AuditLogController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly telegramAnchorService: TelegramAnchorService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'مشاهده لاگ‌های ممیزی مدرسه' })
  async getLogs(
    @CurrentTenant('id') tenantId: string,
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.auditLogService.getTenantLogs(tenantId, {
      entity,
      action,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Get('verify')
  @ApiOperation({ summary: 'بررسی صحت و یکپارچگی زنجیره هش لاگ ممیزی و لنگر خارجی' })
  async verifyIntegrity(@CurrentTenant('id') tenantId: string) {
    return this.auditLogService.verifyAuditLogIntegrity(tenantId);
  }

  /**
   * Manually trigger the Telegram external anchor broadcast.
   * Restricted to SUPER_ADMIN only. The trigger only sends a notification
   * (no sensitive data exposure), so SUPER_ADMIN role alone is sufficient.
   * The Telegram channel itself is private and controlled by the platform owner.
   */
  @Roles(Role.SUPER_ADMIN)
  @Post('anchor/trigger')
  @ApiOperation({
    summary: 'ارسال فوری لنگر خارجی Telegram برای تمام مستأجرین (فقط Super Admin)',
  })
  async triggerTelegramAnchor() {
    return this.telegramAnchorService.triggerManualAnchor();
  }
}
