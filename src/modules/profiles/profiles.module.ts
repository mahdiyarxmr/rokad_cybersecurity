import { Module } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';
import { MediaController } from './media.controller';

@Module({
  controllers: [ProfilesController, MediaController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
