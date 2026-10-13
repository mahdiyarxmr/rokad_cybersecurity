import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HeartbeatService } from './heartbeat.service';

@Module({
  controllers: [HealthController],
  providers: [HeartbeatService],
  exports: [HeartbeatService],
})
export class HealthModule {}

