import { Module } from '@nestjs/common';
import { LearningMaterialsService } from './learning-materials.service';
import { LearningMaterialsController } from './learning-materials.controller';

@Module({
  controllers: [LearningMaterialsController],
  providers: [LearningMaterialsService],
  exports: [LearningMaterialsService],
})
export class LearningMaterialsModule {}
