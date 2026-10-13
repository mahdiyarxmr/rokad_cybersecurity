import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';
import { SmsSchedulerService } from './sms-scheduler.service';
import { SandboxSmsProvider } from './providers/sandbox-sms.provider';
import { KavenegarSmsProvider } from './providers/kavenegar-sms.provider';
import { AmootSmsProvider } from './providers/amoot-sms.provider';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [SmsController],
  providers: [
    SmsService,
    SmsSchedulerService,
    SandboxSmsProvider,
    KavenegarSmsProvider,
    AmootSmsProvider,
  ],
  exports: [SmsService],
})
export class SmsModule {}
