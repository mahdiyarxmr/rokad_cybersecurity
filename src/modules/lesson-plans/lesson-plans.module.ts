import { Module } from '@nestjs/common';
import { LessonPlansService } from './lesson-plans.service';
import { LessonPlansController } from './lesson-plans.controller';

@Module({
  controllers: [LessonPlansController],
  providers: [LessonPlansService],
  exports: [LessonPlansService],
})
export class LessonPlansModule {}
