import { Global, Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';
import { TelegramAnchorService } from '../../common/audit-anchor/telegram-anchor.service';

@Global()
@Module({
  controllers: [AuditLogController],
  providers: [AuditLogService, TelegramAnchorService],
  exports: [AuditLogService, TelegramAnchorService],
})
export class AuditLogModule {}
