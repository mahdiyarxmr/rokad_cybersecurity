import { Global, Module } from '@nestjs/common';
import { TelegramAnchorService } from './telegram-anchor.service';

@Global()
@Module({
  providers: [TelegramAnchorService],
  exports: [TelegramAnchorService],
})
export class AuditAnchorModule {}
