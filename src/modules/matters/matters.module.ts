import { Module } from '@nestjs/common';
import { MattersService } from './matters.service';
import { MattersController } from './matters.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [MattersController],
  providers: [MattersService],
  exports: [MattersService],
})
export class MattersModule {}
